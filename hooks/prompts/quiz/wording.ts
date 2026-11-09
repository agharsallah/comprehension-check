// The wording rule of the quiz instructions.

import type { Wording } from '../../config'

// The rules a plain-worded quiz adds. Plain is about the reading, not the
// difficulty: the reasoning a question asks for stays the same.
export const PLAIN_WORDING = `Wording: plain. The user wants to spend their time thinking about the answer, not working out what the question means. Write every question, option and piece of feedback in plain, everyday words:
   - short sentences of about 15 words, one idea each. A question may set the scene in a few such sentences, then asks ONE thing; about 40 words in all. Not "what happens, and why?": the options carry the why,
   - say what each number is: "a price of 10 at 9:00", not "A1 at 10 at 9:00",
   - option labels of 1-4 words that name the idea; descriptions of about 12 words at most,
   - keep each question anchored: still name the function or file it is about, in backticks. Cut the jargon around that name instead: the first time a status code, header or technical term appears, say what it means in a few words ("a 412, the server's answer that someone saved first"), and describe code operators in words ("treats a copied list as changed", not "!== compares references"). This holds for options as much as questions, and each question stands alone: explain a term again in every question that uses it,
   - active voice with a clear subject ("getPrice returns the old price", not "a stale value is returned"), one idea per sentence, no double negatives, no "Which of the following statements is true",
   - when the twist of a question is a negation ("does NOT prove", "is NOT true"), write NOT in capitals so it cannot be missed,
   - in the scorecard, the same plain words: a newcomer to this code reads each punchline, explanation and next_step in one pass.
   Plain words must not make the answer easier to guess: keep the reasoning just as hard and the options just as fair. Every other rule still applies.`

// The wording rules for the user's setting: none for standard wording.
export const wordingRules = (wording: Wording): string[] => (wording === 'plain' ? [PLAIN_WORDING] : [])
