// When to quiz: track edits, remind Claude, gate the quiz call, and send
// Claude back at Stop when a turn changed code but asked no quiz.
//
// With quizzes on important changes only (Settings.trigger), the first-edit
// note just asks Claude to call the check tool (triage/checkTool.ts) when its
// edits are done; at Stop, a turn that did not is judged here instead, and
// a change the triage model calls routine ends the turn with no quiz.

import type { EngineInterface, On } from 'claude-code'

import { QUIZ_TOOL, QUIZ_SOURCE, TRIAGE } from '../config'
import type { ChangeTracker } from '../changes/changeTracker'
import { editedPath, isEditTool, linesChangedBy } from '../changes/edits'
import { isIgnoredFile } from '../changes/ignoredFiles'
import type { IgnoredFileCache } from '../changes/ignoredFiles'
import { asRecord } from '../lib/values'
import { isQuizEnabled, readSettings } from '../settings/settings'
import { excerptOf } from '../triage/excerpts'
import { judgeChange, skipRoutineChange } from '../triage/triage'
import type { TriageMemo } from '../triage/triage'
import { askToStartQuiz } from './gate'
import { changeGrewNote, firstEditNote, importantFirstEditNote, unquizzedStopNote } from '../prompts/turnNotes'
import { skippedReply, wrongLengthReply } from '../prompts/quizReplies'
import { fitsQuestionCount, knownQuizLength, questionCountFor } from './questionCount'
import type { QuestionCount } from './questionCount'
import type { OwnDialogs } from './ownDialogs'
import type { QuizRequest } from './quizRequest'
import type { QuizRounds } from './quizRounds'
import type { TurnReminders } from './turnReminders'

export type QuizFlowDeps = {
  changes: ChangeTracker
  reminders: TurnReminders
  rounds: QuizRounds
  ownDialogs: OwnDialogs
  ignoredFiles: IgnoredFileCache
  request: QuizRequest
  // The triage verdict on the change as it stands, when quizzes come only
  // for important changes.
  memo: TriageMemo
}

const isQuizCall = (input: unknown) => {
  const rec = asRecord(input)
  return rec?.tool === QUIZ_TOOL && asRecord(rec.metadata)?.source === QUIZ_SOURCE
}

const questionsIn = (input: unknown) => {
  const questions = asRecord(input)?.questions
  return Array.isArray(questions) ? questions.length : 0
}

// A hidden user message; it reaches Claude at the loop's next step, even where
// a policy plugin above passes over this mod's Stop hook.
async function tellClaude($: EngineInterface, text: string) {
  await $.session.append({ message: { type: 'user', content: [{ type: 'text', text }] } })
}

// Whether the mod checks a quiz call: always for one the user asked for or a
// later round of one in progress; otherwise while quizzes are on.
async function checksQuiz($: EngineInterface, { request, rounds }: QuizFlowDeps) {
  return request.requested !== undefined || rounds.count !== undefined || isQuizEnabled($)
}

// Before a quiz round runs: check its length and, before the first round,
// ask the user whether they want the quiz, unless they asked for it. Returns
// the refusal, or the count the quiz keeps to.
async function gateQuiz(
  $: EngineInterface,
  input: unknown,
  { changes, rounds, request, memo }: QuizFlowDeps,
): Promise<{ deny: string } | { count: QuestionCount }> {
  const asked = questionsIn(input)
  const askedBefore = rounds.askedSoFar
  const inProgress = rounds.count
  // A later round of the quiz in progress: the user already said yes.
  if (askedBefore !== undefined && inProgress !== undefined) {
    return fitsQuestionCount(inProgress, asked, askedBefore)
      ? { count: inProgress }
      : { deny: wrongLengthReply(inProgress, asked, askedBefore) }
  }
  const requested = request.requested
  const count = questionCountFor(await readSettings($), requested ?? changes.owed)
  // A quiz of the wrong length goes back to Claude before the user sees it.
  if (!fitsQuestionCount(count, asked)) return { deny: wrongLengthReply(count, asked) }
  if (requested !== undefined) return { count }
  const why = memo.quizReasonAt(changes.revision)
  if (await askToStartQuiz($, [...changes.owed.keys()], knownQuizLength(count, asked) ?? 0, why)) return { count }
  changes.forget()
  return { deny: skippedReply }
}

// After a successful edit: record it, and leave Claude the note it calls for.
async function recordEdit($: EngineInterface, input: unknown, { changes, reminders, ignoredFiles }: QuizFlowDeps) {
  const path = editedPath(input)
  // Lock files and git-ignored files are never quizzed on.
  if (path === undefined || (await isIgnoredFile($, path, ignoredFiles))) return
  changes.record(path, linesChangedBy(input), excerptOf(input, TRIAGE.perEditChars))
  if (!(await isQuizEnabled($))) return

  const settings = await readSettings($)
  const count = questionCountFor(settings, changes.current)
  const note = reminders.noteFor(count)
  // For important changes only, the instructions come from the check tool, sized then.
  if (settings.trigger === 'important') {
    if (note === 'first-edit') await tellClaude($, importantFirstEditNote())
    return
  }
  if (note === 'first-edit') await tellClaude($, firstEditNote(count, settings))
  if (note === 'change-grew' && count.mode === 'size') await tellClaude($, changeGrewNote(count))
}

export function registerQuizFlow(on: On, deps: QuizFlowDeps) {
  const { changes, reminders, rounds, ownDialogs, request } = deps
  on('turn.start', async ($, e, next) => {
    if (e.agentId === undefined) {
      reminders.startTurn()
      rounds.end()
      request.startTurn()
    }
    return next(e)
  })

  on('tool.call', async ($, e, next) => {
    const isMainLoop = e.agentId === undefined
    let quiz: QuestionCount | undefined
    if (isMainLoop && isQuizCall(e) && (await checksQuiz($, deps))) {
      const gated = await gateQuiz($, e, deps)
      if ('deny' in gated) return gated
      quiz = gated.count
    }

    const ran = await next(e)
    // Asked or dismissed, a requested quiz is over; later rounds keep its count.
    if (quiz !== undefined) request.close()
    if (ran.deny !== undefined || ran.isError === true) {
      // A dismissed round ends the quiz.
      if (quiz !== undefined) rounds.end()
      return ran
    }
    if (quiz !== undefined) rounds.recordRound(quiz, questionsIn(e))

    if (isMainLoop && e.tool === QUIZ_TOOL && !ownDialogs.isOpen()) {
      // The quiz happened (not a settings dialog): nothing is owed until the next edit.
      changes.forget()
    } else if (isEditTool(e.tool)) {
      await recordEdit($, e, deps)
    }
    return ran
  })

  on('classic.Stop', async ($, e, next) => {
    const result = await next(e)
    // Someone else is already sending Claude back, or this is the stop after
    // our own push: let it end.
    if (result.block !== undefined || e.stop_hook_active) return result
    if (!changes.hasPending()) return result
    if (!(await isQuizEnabled($))) {
      changes.takePending()
      return result
    }
    const settings = await readSettings($)
    // For important changes only: Claude did not call the check tool, so ask here.
    const verdict = settings.trigger === 'important' ? await judgeChange($, changes, deps.memo) : undefined
    if (verdict !== undefined && !verdict.quiz) {
      await skipRoutineChange($, changes, verdict)
      return result
    }
    const owed = changes.takePending()
    changes.handToStop(owed)
    const count = questionCountFor(settings, owed)
    return { ...result, block: unquizzedStopNote([...owed.keys()], count, settings, verdict?.reason) }
  })
}
