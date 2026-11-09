// The note left for Claude by `/quiz last|uncommitted|codebase`, before the
// prompt that starts the quiz's turn.

import { plural } from '../lib/text'
import type { QuestionCount } from '../quiz/questionCount'
import { quizInstructions } from './quiz/instructions'
import type { QuizStyle } from './quiz/instructions'
import { fill, listed, when } from './template'

// What an on-demand quiz is about, as Claude is told it.
export type QuizSubject = {
  // "the last 2 commits (a1b2c3d Fix the cache; …)"
  what: string
  // How to read it: the git command, or the files themselves.
  howToRead: string
  // One line per file, largest first, and how many more were left out.
  fileLines: readonly string[]
  moreFiles: number
  files: number
  lines: number
  // True for code as it stands rather than a diff (`/quiz codebase`).
  isWholeCode: boolean
}

const REQUESTED_QUIZ = `{{tag}} The user asked to be quizzed on {{what}}. Read it first: {{howToRead}}

Files: {{files}}, about {{lines}} lines, largest first:{{fileList}}{{moreFiles}}

{{reading}}

Then quiz the user:
{{instructions}}`

const MORE_FILES = '\n- … and {{count}} more'

// The rules speak of "the change" and "a decision Claude made"; these say
// what those mean when the user picked the code.
const READING_WHOLE_CODE =
  'This quiz is on the code as it stands, not on a recent change. In the rules below, "the change" means this code: read its most important and riskiest parts (entry points, core logic, state, error handling); you do not need to read every file. "A decision Claude made" means a design decision in the code that reading it does not explain.'

const READING_DIFF =
  'In the rules below, "the change" means this diff, whoever wrote it, and "a decision Claude made" means a decision its author made that the diff does not explain.'

export const requestedQuizNote = (subject: QuizSubject, count: QuestionCount, style: QuizStyle) =>
  fill(REQUESTED_QUIZ, {
    what: subject.what,
    howToRead: subject.howToRead,
    files: `${subject.files} ${plural(subject.files, 'file')}`,
    lines: subject.lines,
    fileList: listed(subject.fileLines, '- '),
    moreFiles: when(subject.moreFiles > 0, fill(MORE_FILES, { count: subject.moreFiles })),
    reading: subject.isWholeCode ? READING_WHOLE_CODE : READING_DIFF,
    instructions: quizInstructions(count, style, { requested: true }),
  })
