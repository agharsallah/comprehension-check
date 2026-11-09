import { expect, test } from 'claude-code/testing'

import { PERSPECTIVES, WORDINGS } from '../hooks/config'
import { checkNothingReply, checkQuizReply, checkSkipReply } from '../hooks/prompts/checkReplies'
import { quizInstructions } from '../hooks/prompts/quiz/instructions'
import { skippedReply, wrongLengthReply } from '../hooks/prompts/quizReplies'
import { requestedQuizNote } from '../hooks/prompts/requestedQuiz'
import { SHARED_SLOTS, fill, listed, numbered, when } from '../hooks/prompts/template'
import { resultsRefusedReply, scorecardShownReply } from '../hooks/prompts/tools'
import { changeGrewNote, firstEditNote, importantFirstEditNote, unquizzedStopNote } from '../hooks/prompts/turnNotes'
import type { QuestionCount } from '../hooks/quiz/questionCount'
import { excerptOf } from '../hooks/triage/excerpts'
import { triageMessage } from '../hooks/triage/triageMessage'

// ─── The template ────────────────────────────────────────────────────────────

test('fill: each slot takes its value, every time it appears', async () => {
  expect(fill('{{a}} and {{b}}, then {{a}} again', { a: 'x', b: 2 })).toBe('x and 2, then x again')
  expect(fill('no slots here', {})).toBe('no slots here')
})

test('fill: the shared names fill themselves', async () => {
  expect(fill('{{tag}} call {{quizTool}}, {{perDialog}} at a time', {})).toBe(
    `${SHARED_SLOTS.tag} call ${SHARED_SLOTS.quizTool}, ${SHARED_SLOTS.perDialog} at a time`,
  )
})

test('fill: a value is inserted as written, never read as a template', async () => {
  // A file name or a model's words can hold anything.
  expect(fill('see {{path}}', { path: '{{tag}} $& $1 $$' })).toBe('see {{tag}} $& $1 $$')
  expect(fill('{{a}}{{b}}', { a: '{{b}}', b: 'B' })).toBe('{{b}}B')
})

test('fill: single braces are text; anything in double braces is a slot', async () => {
  expect(fill('metadata: {"source": "x"} { {a} }', {})).toBe('metadata: {"source": "x"} { {a} }')
  expect(fill('{{a-b}} {{ c }}', { 'a-b': 1, ' c ': 2 })).toBe('1 2')
})

test('fill: a slot with no value throws instead of reaching Claude', async () => {
  expect(() => fill('hi {{name}}', {} as never)).toThrow('no value for {{name}}')
})

test('fill: a missing or misspelt value is a type error', async () => {
  // @ts-expect-error: no value for {{name}}
  expect(() => fill('hi {{name}}', {})).toThrow()
  // @ts-expect-error: {{nmae}} is not a slot of this template
  expect(() => fill('hi {{name}}', { nmae: 'x' })).toThrow()
})

test('list helpers: one item per line, numbered rules, optional parts', async () => {
  expect(listed(['a', 'b'], '- ')).toBe('\n- a\n- b')
  expect(listed([], '- ')).toBe('')
  expect(numbered(['first', 'second'])).toBe('1. first\n2. second')
  expect(when(true, 'yes')).toBe('yes')
  expect(when(false, 'yes')).toBe('')
})

// ─── Every prompt, filled ────────────────────────────────────────────────────

const COUNTS: QuestionCount[] = [
  { mode: 'agent', max: 1 },
  { mode: 'agent', max: 7 },
  { mode: 'size', exact: 1, files: 1, lines: 5 },
  { mode: 'size', exact: 9, files: 3, lines: 400 },
]

const SUBJECT = {
  what: 'the last commit',
  howToRead: '`git show abc`.',
  fileLines: ['a.ts (3 lines)'],
  moreFiles: 2,
  files: 3,
  lines: 9,
  isWholeCode: false,
}

const everyPrompt = (): string[] => {
  const prompts: string[] = []
  for (const count of COUNTS) {
    for (const perspective of PERSPECTIVES) {
      for (const wording of WORDINGS) {
        const style = { perspective, wording }
        prompts.push(
          quizInstructions(count, style, { requested: true }),
          firstEditNote(count, style),
          checkQuizReply(count, style, 'why'),
          unquizzedStopNote(['/a.ts'], count, style, 'why'),
          requestedQuizNote(SUBJECT, count, style),
          requestedQuizNote({ ...SUBJECT, isWholeCode: true, moreFiles: 0 }, count, style),
        )
      }
    }
    prompts.push(wrongLengthReply(count, 9), wrongLengthReply(count, 2), wrongLengthReply(count, 3, 2))
  }
  prompts.push(
    changeGrewNote({ mode: 'size', exact: 3, files: 1, lines: 60 }),
    importantFirstEditNote(),
    checkSkipReply('docs'),
    checkSkipReply(),
    checkNothingReply('off'),
    checkNothingReply('no-change'),
    skippedReply,
    resultsRefusedReply,
    scorecardShownReply(75, 3, 4),
    triageMessage(new Map([['/r/a.ts', 2]]), [{ path: '/r/a.ts', text: '+ a' }], 10),
    excerptOf({ tool: 'Write', content: 'x\n'.repeat(500) }, 100),
    excerptOf({ tool: 'NotebookEdit', edit_mode: 'delete' }, 100),
  )
  return prompts
}

test('no prompt reaches Claude with a slot left in it', async () => {
  for (const prompt of everyPrompt()) expect(prompt).not.toMatch(/\{\{[^{}]+\}\}/)
})

test('the prompts name the tools by their full names', async () => {
  const all = everyPrompt().join('\n')
  expect(all).toContain(SHARED_SLOTS.quizTool)
  expect(all).toContain(SHARED_SLOTS.resultsTool)
  expect(importantFirstEditNote()).toContain(SHARED_SLOTS.checkTool)
  expect(scorecardShownReply(75, 3, 4)).toStartWith('Scorecard shown to the user: 75% (3/4).')
  expect(resultsRefusedReply).toStartWith('quiz_results needs')
})
