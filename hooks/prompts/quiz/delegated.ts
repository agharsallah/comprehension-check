// The quiz instructions when a model is picked to write the quiz: Claude
// hands the writing to the quiz-writer subagent, then asks its questions and
// grades them. The rules for writing (perspective, wording, formats, options)
// go to the subagent, not here: writer/writerAgent.ts adds them as it starts.

import { mayNeedRounds } from '../../quiz/questionCount'
import type { QuestionCount } from '../../quiz/questionCount'
import { fill, numbered, when } from '../template'
import { howToAsk } from './asking'
import type { QuizStyle } from './instructions'
import { GRADING_RULE, NO_EDITS_RULE, SKIPPED_QUIZ_RULE } from './rules'

const HAND_OFF = `The user picked a model to write their quizzes, so do not write the questions yourself. Call the Agent tool ONCE with subagent_type "{{writerAgent}}", description "Write the quiz", and a prompt that gives:
   - what changed and how to read it: the files, and the command that shows the change (\`git diff\` for uncommitted work) or the files themselves,
   - every decision behind the change that the user did not ask for, when you know them: a default, an assumption, something left out of scope, how two requirements in tension were resolved; each with why, in a line.
   It already has the user's quiz settings. It answers with one JSON object: \`answer_key\`, what is right and why, and \`questions\`, ready for {{quizTool}}.`

const ASK_ITS_QUESTIONS = `Ask the user its questions word for word: pass its \`questions\` to {{quizTool}} as they are, with their options and multiSelect, adding, dropping or rewording none. A question whose key entry has \`free_text\` true leaves the right answer out of its options on purpose, so the user writes it under "Other": ask it as it is, and do not send it back to the agent. {{howToAsk}}`

const IF_IT_FAILS = `If the agent fails, or its answer holds no usable questions, write them yourself: on the riskiest parts of the change, testing reasoning rather than trivia, each with 2-4 plausible options and the right one not standing out.`

const GRADE_BY_KEY = `Grade against the agent's \`answer_key\`; where the user's answer shows something the key missed, the user is right and the explanation says so. A key entry with a \`finding\` is a real bug: it goes in that question's \`finding\` on the scorecard.`

const PLAIN_SCORECARD = `Wording: plain. Write the scorecard's punchlines, explanations and next_step in plain, everyday words a newcomer to this code reads in one pass.`

export const delegatedQuizInstructions = (count: QuestionCount, style: QuizStyle, requested: boolean) =>
  numbered([
    fill(HAND_OFF, {}),
    fill(ASK_ITS_QUESTIONS, { howToAsk: howToAsk(count, requested) }),
    IF_IT_FAILS,
    fill(SKIPPED_QUIZ_RULE, {}),
    `${GRADE_BY_KEY} ${fill(GRADING_RULE, { lastRound: when(mayNeedRounds(count), ' the last round') })}`,
    ...(style.wording === 'plain' ? [PLAIN_SCORECARD] : []),
    NO_EDITS_RULE,
  ])
