// Phrases more than one prompt uses.

import { plural } from '../lib/text'
import { fill, when } from './template'

// "1 question", "3 questions".
export const questions = (n: number): string => `${n} ${plural(n, 'question')}`

const WORTH_A_QUIZ = ' It is worth a quiz: {{why}}.'

// What makes the change worth a quiz, as the triage model put it; nothing
// when it did not say.
export const worthQuizNote = (why: string | undefined): string =>
  when(why !== undefined, fill(WORTH_A_QUIZ, { why: why ?? '' }))
