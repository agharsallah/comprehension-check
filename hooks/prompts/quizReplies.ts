// The replies to a refused quiz call: a round of the wrong length, or a quiz
// the user skipped at the gate.

import { QUESTION_LIMITS } from '../config'
import { nextRoundSize } from '../quiz/questionCount'
import type { QuestionCount } from '../quiz/questionCount'
import { questions } from './shared'
import { fill, when } from './template'

const TOO_MANY_PER_CALL =
  '{{quizTool}} takes at most {{perDialog}} questions per call, and this call has {{asked}}. Ask the quiz in rounds of at most {{perDialog}}, with the same metadata on each.'

const NOT_EXACT =
  "The user's quiz settings ask for exactly {{exact}} questions for this change, and this call has {{asked}}{{earlier}}. Call {{quizTool}} again with exactly {{next}} questions{{inRounds}}."

const IN_ROUNDS = ' (rounds of {{perDialog}}, the rest last)'

const OVER_MAX =
  "The user's quiz settings allow at most {{max}}, and this call has {{asked}}{{earlier}}. Call {{quizTool}} again with at most {{left}}."

const EARLIER_ROUNDS = ' after {{askedBefore}} in earlier rounds'

const SKIPPED =
  'The user chose to skip the comprehension quiz. Do not ask again and do not call {{resultsTool}}; end your turn with one short line.'

// The reply to a quiz round whose length breaks the settings.
export const wrongLengthReply = (count: QuestionCount, asked: number, askedBefore = 0) => {
  const { perDialog } = QUESTION_LIMITS
  if (asked > perDialog) return fill(TOO_MANY_PER_CALL, { asked })
  const earlier = when(askedBefore > 0, fill(EARLIER_ROUNDS, { askedBefore }))
  if (count.mode === 'size') {
    return fill(NOT_EXACT, {
      exact: count.exact,
      asked,
      earlier,
      next: nextRoundSize(count, askedBefore),
      inRounds: when(count.exact > perDialog, fill(IN_ROUNDS, {})),
    })
  }
  return fill(OVER_MAX, { max: questions(count.max), asked, earlier, left: questions(count.max - askedBefore) })
}

export const skippedReply = fill(SKIPPED, {})
