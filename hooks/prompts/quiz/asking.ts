// The first rule of the quiz instructions: how many questions, how to call
// the dialog (once, or in rounds when the quiz may not fit one), and how the
// quiz reaches the user.

import { plural } from '../../lib/text'
import { mayNeedRounds } from '../../quiz/questionCount'
import type { QuestionCount } from '../../quiz/questionCount'
import { questions } from '../shared'
import { fill } from '../template'

const SIZED_COUNT = 'exactly {{questions}} (1 per {{linesPerQuestion}} changed lines: about {{lines}} lines in {{files}})'

const AGENT_COUNT =
  '1 to {{max}} questions. Weigh how severe and complex the change is: a small, low-risk change gets few; a large, risky or intricate one gets more, never more than {{max}}'

const ONE_CALL = 'Call {{quizTool}} ONCE with {{howMany}}. Pass metadata: {"source": "{{quizSource}}"}.'

const SIZED_ROUNDS =
  'ask them in rounds: {{quizTool}} takes at most {{perDialog}} questions per call, so call it with {{perDialog}}, then the next {{perDialog}}, and the rest last'

const AGENT_ROUNDS =
  '{{quizTool}} takes at most {{perDialog}} questions per call: up to {{perDialog}}, call it ONCE; for more, ask them in rounds of {{perDialog}}, the last one holding the rest'

const IN_ROUNDS =
  'Ask {{howMany}}; {{rounds}}. Pass metadata: {"source": "{{quizSource}}"} on every round. The user is asked to start only before the first round; if they dismiss a later round, ask no more and grade the rounds they answered.'

const REACHES_THEM_REQUESTED =
  'The user asked for this quiz, so it goes straight to them, with answering instructions above your questions.'

const REACHES_THEM_GATED =
  'The mod first asks the user whether they want the quiz, then shows answering instructions above your questions.'

// "exactly 3 questions (…)", "1 to 4 questions. Weigh …".
export const howManyQuestions = (count: QuestionCount): string => {
  if (count.mode === 'size') {
    return fill(SIZED_COUNT, {
      questions: questions(count.exact),
      lines: count.lines,
      files: `${count.files} ${plural(count.files, 'file')}`,
    })
  }
  return count.max === 1 ? '1 question' : fill(AGENT_COUNT, { max: count.max })
}

const howToCall = (count: QuestionCount): string => {
  const howMany = howManyQuestions(count)
  if (!mayNeedRounds(count)) return fill(ONE_CALL, { howMany })
  return fill(IN_ROUNDS, { howMany, rounds: fill(count.mode === 'size' ? SIZED_ROUNDS : AGENT_ROUNDS, {}) })
}

// `requested`: the user asked for this quiz (`/quiz last` and the like), so
// it goes to them without the yes/no question first.
export const howToAsk = (count: QuestionCount, requested: boolean): string =>
  `${howToCall(count)} ${requested ? REACHES_THEM_REQUESTED : REACHES_THEM_GATED}`
