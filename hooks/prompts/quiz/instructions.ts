// The quiz instructions: the numbered rules every note that asks for a quiz
// carries, put together from the files beside this one.

import type { Perspective, Wording } from '../../config'
import { mayNeedRounds } from '../../quiz/questionCount'
import type { QuestionCount } from '../../quiz/questionCount'
import { fill, numbered, when } from '../template'
import { howToAsk } from './asking'
import { QUIZ_GOAL } from './goal'
import { perspectiveRule } from './perspective'
import { FORMAT_RULES, GRADING_RULE, NO_EDITS_RULE, OPTION_RULES, QUESTION_RULES, SKIPPED_QUIZ_RULE } from './rules'
import { wordingRules } from './wording'

// How the quiz reads: the angle its questions take and how they are worded.
// The user's Settings carry both.
export type QuizStyle = { perspective: Perspective; wording: Wording }

// `requested`: the user asked for this quiz (`/quiz last` and the like), so
// it goes to them without the yes/no question first.
export type QuizOptions = { requested?: boolean }

export const quizInstructions = (count: QuestionCount, style: QuizStyle, { requested = false }: QuizOptions = {}) =>
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
