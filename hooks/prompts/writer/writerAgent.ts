// What the quiz-writer subagent is told: its listing line, its system prompt
// (the rules every quiz keeps), and its task (the brief Claude wrote, then
// the user's settings: length, perspective, wording), added as it starts.

import type { QuestionCount } from '../../quiz/questionCount'
import { howManyQuestions } from '../quiz/asking'
import { QUIZ_GOAL } from '../quiz/goal'
import type { QuizStyle } from '../quiz/instructions'
import { perspectiveRule } from '../quiz/perspective'
import { FORMAT_RULES, OPTION_RULES, QUESTION_RULES } from '../quiz/rules'
import { wordingRules } from '../quiz/wording'
import { fill, numbered } from '../template'

// The line the Agent tool lists it by.
export const WRITER_DESCRIPTION =
  'Writes the comprehension quiz on a code change, as JSON. Use only when a comprehension-check note tells you to.'

const WRITER_SYSTEM = `You write a short comprehension quiz on a code change for the developer who owns it. Another agent made the change; its message tells you what changed, how to read it, and the decisions behind it that the user did not ask for. The user's quiz settings follow that message.

First read the change: the diff, or the files, and the code around it where the diff alone does not explain it. You only read: change no file, and run no command that changes anything.

{{goal}}

Every quiz keeps these rules; the settings add the rest:
{{rules}}

Each option's description argues FOR its label, as someone who picked it would: the reason it seems right. A wrong option never says why it is wrong ("Throws an error: no check runs, so nothing is thrown" gives itself away); the answer key says that.

A finding the rules speak of (a real bug you found) goes in the answer key's \`finding\`, never in the question. The other agent asks the questions as you wrote them and grades with your key.

Reply with one JSON object and nothing else, no code fence. Write \`answer_key\` first: settle what is right, and why, before you write the options that hide it.
{"answer_key": [{"header": "...", "correct": "the right answer, short", "why": "1-2 sentences tied to the code", "free_text": false, "finding": "only for a real bug: one line, and the input that triggers it"}], "questions": [{"question": "...", "header": "...", "multiSelect": false, "options": [{"label": "...", "description": "..."}]}]}
- both arrays, always: one answer_key entry per question, in the same order, with the same header,
- \`correct\` names the right option (all of them for a checkbox question). For the question whose options leave the right answer out on purpose, \`correct\` is the answer the user should write and \`free_text\` is true,
- a header of at most 12 characters,
- nothing in a question or its options that marks the right answer.`

const WRITER_TASK = `{{brief}}

---
The user's quiz settings:
{{settings}}`

export const writerSystem = () => fill(WRITER_SYSTEM, { goal: QUIZ_GOAL, rules: numbered([QUESTION_RULES, FORMAT_RULES, OPTION_RULES]) })

// Claude's brief, then what the user's settings ask of this quiz.
export const writerTask = (brief: string, count: QuestionCount, style: QuizStyle) =>
  fill(WRITER_TASK, {
    brief: brief.trim(),
    settings: numbered([`Write ${howManyQuestions(count)}.`, perspectiveRule(style.perspective), ...wordingRules(style.wording)]),
  })
