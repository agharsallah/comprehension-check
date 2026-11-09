// What the check tool (triage/checkTool.ts) answers Claude: the quiz to ask,
// no quiz, or nothing to judge.

import type { QuestionCount } from '../quiz/questionCount'
import { quizInstructions } from './quiz/instructions'
import type { QuizStyle } from './quiz/instructions'
import { worthQuizNote } from './shared'
import { fill, when } from './template'

const NEEDS_QUIZ = `{{tag}} This change needs a quiz.{{worthIt}} Quiz the user now, before you end your turn:
{{instructions}}`

const NEEDS_NO_QUIZ =
  '{{tag}} This change needs no quiz{{why}}. Do not quiz the user and do not call {{resultsTool}}; end your turn as you normally would.'

const NOTHING_TO_JUDGE = '{{tag}} {{cause}}, so there is no quiz. End your turn as you normally would.'

const NOTHING_CAUSES = {
  'no-change': 'No code changed since the last quiz',
  off: 'Quizzes are off',
} as const

// The change needs a quiz: how to ask it, and why it is worth one.
export const checkQuizReply = (count: QuestionCount, style: QuizStyle, why?: string) =>
  fill(NEEDS_QUIZ, { worthIt: worthQuizNote(why), instructions: quizInstructions(count, style) })

// The change needs none.
export const checkSkipReply = (why?: string) => fill(NEEDS_NO_QUIZ, { why: when(why !== undefined, ` (${why})`) })

// Nothing to judge: no code changed since the last quiz, or quizzes are off.
export const checkNothingReply = (cause: keyof typeof NOTHING_CAUSES) =>
  fill(NOTHING_TO_JUDGE, { cause: NOTHING_CAUSES[cause] })
