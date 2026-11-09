// The quiz instructions: the numbered rules every note that asks for a quiz
// carries, put together from the files beside this one: the full rules when
// Claude writes the quiz, or the hand-off to the quiz writer (delegated.ts).

import { SAME_AS_SESSION } from '../../config'
import type { Perspective, Wording } from '../../config'
import { mayNeedRounds } from '../../quiz/questionCount'
import type { QuestionCount } from '../../quiz/questionCount'
import { fill, numbered, when } from '../template'
import { howToAsk } from './asking'
import { delegatedQuizInstructions } from './delegated'
import { QUIZ_GOAL } from './goal'
import { perspectiveRule } from './perspective'
import { FORMAT_RULES, GRADING_RULE, NO_EDITS_RULE, OPTION_RULES, QUESTION_RULES, SKIPPED_QUIZ_RULE } from './rules'
import { wordingRules } from './wording'

// How the quiz reads: the angle its questions take and how they are worded,
// and who writes it: `quizModel`, SAME_AS_SESSION (or absent) for Claude
// itself, else the model of the quiz-writer subagent. The user's Settings
// carry all three.
export type QuizStyle = { perspective: Perspective; wording: Wording; quizModel?: string }

// Whether a subagent on a picked model writes the quiz.
export const usesQuizWriter = (style: { quizModel?: string }): boolean =>
  style.quizModel !== undefined && style.quizModel !== SAME_AS_SESSION

// `requested`: the user asked for this quiz (`/quiz last` and the like), so
// it goes to them without the yes/no question first.
export type QuizOptions = { requested?: boolean }

export const quizInstructions = (count: QuestionCount, style: QuizStyle, { requested = false }: QuizOptions = {}) =>
  usesQuizWriter(style) ? delegatedQuizInstructions(count, style, requested) : ownQuizInstructions(count, style, requested)

// The instructions for Claude writing the quiz itself.
const ownQuizInstructions = (count: QuestionCount, style: QuizStyle, requested: boolean) =>
  numbered([
    howToAsk(count, requested),
    QUIZ_GOAL,
    perspectiveRule(style.perspective),
    ...wordingRules(style.wording),
    QUESTION_RULES,
    FORMAT_RULES,
    OPTION_RULES,
    fill(SKIPPED_QUIZ_RULE, {}),
    fill(GRADING_RULE, { lastRound: when(mayNeedRounds(count), ' the last round') }),
    NO_EDITS_RULE,
  ])
