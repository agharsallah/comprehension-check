// The notes left for Claude during a turn that changes code: at its first
// edit, when the change grows, and from the Stop hook when it tried to end
// the turn without the quiz.

import type { QuestionCount, SizedCount } from '../quiz/questionCount'
import { quizInstructions } from './quiz/instructions'
import type { QuizStyle } from './quiz/instructions'
import { questions, worthQuizNote } from './shared'
import { fill, listed, when } from './template'

const FIRST_EDIT = `{{tag}} The user has enabled comprehension quizzes. You have started changing code in this turn. Keep working on the task as normal; once ALL the code changes for this request are done, and before you end your turn, quiz the user on what you changed:
{{instructions}}{{growHint}}`

const GROW_HINT = '\nIf the change grows, a later {{tag}} note raises the count; use the latest one.'

const CHANGE_GREW = '{{tag}} The change has grown to about {{lines}} changed lines: ask exactly {{questions}} in the quiz.'

const IMPORTANT_FIRST_EDIT =
  '{{tag}} The user has enabled comprehension quizzes for important changes. You have started changing code in this turn. Keep working on the task as normal; once ALL the code changes for this request are done, and before you end your turn, call {{checkTool}} once, with no arguments. It tells you whether this change needs a quiz and, if it does, exactly how to ask it. Do not quiz the user unless it tells you to.'

const UNQUIZZED_STOP = `{{tag}} You changed code this turn. Before ending, quiz the user on it to check their understanding and build their critical thinking.{{worthIt}}

Files changed: {{files}}

Do this now:
{{instructions}}`

// Left for Claude at the first edit of a turn.
export const firstEditNote = (count: QuestionCount, style: QuizStyle) =>
  fill(FIRST_EDIT, {
    instructions: quizInstructions(count, style),
    growHint: when(count.mode === 'size', fill(GROW_HINT, {})),
  })

// Left for Claude when the change has grown into a larger quiz (size mode).
export const changeGrewNote = (count: SizedCount) =>
  fill(CHANGE_GREW, { lines: count.lines, questions: questions(count.exact) })

// Left for Claude at the first edit of a turn when quizzes come only for
// important changes. Short on purpose: the quiz instructions come back from
// the check tool only when the change needs a quiz, so a routine turn never
// carries them.
export const importantFirstEditNote = () => fill(IMPORTANT_FIRST_EDIT, {})

// Sent back to Claude by the Stop hook when it tried to end an unquizzed turn.
// `why`: what makes the change worth a quiz, when the triage model said.
export const unquizzedStopNote = (files: readonly string[], count: QuestionCount, style: QuizStyle, why?: string) =>
  fill(UNQUIZZED_STOP, {
    worthIt: worthQuizNote(why),
    files: listed(files, '- '),
    instructions: quizInstructions(count, style),
  })
