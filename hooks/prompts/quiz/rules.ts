// The fixed rules of the quiz instructions, in the order they are given:
// what every question must do, the formats, the options, a skipped quiz,
// grading, and no edits during the quiz.

export const QUESTION_RULES = `Every question must:
   - be about THIS change: name the file, function or behavior it is about, and turn on what the change added or altered, not on code it left as it was. If someone could answer it without having seen the change, rewrite it,
   - test reasoning (why, what if, what breaks, what it proves), not trivia such as names, syntax, line counts or API spellings,
   - hold one idea and stand alone: the dialog shows only the question and its options.
   Across the quiz, always through the chosen perspective:
   - ask at least one question about a decision Claude made that the user did not ask for: a default, an assumption, something left out of scope, or how two requirements in tension were resolved. Summaries hide these,
   - if the change added or ran tests or checks, ask what they prove and what they would miss: a green check proves one thing,
   - start with the riskiest part of the change, where being wrong costs the most.`

export const FORMAT_RULES = `With 2 or more questions, mix the formats:
   - at least one single-choice question (multiSelect: false),
   - at least one checkbox question (multiSelect: true) where more than one option is correct,
   - the user can always type a free-text answer via "Other"; for one question, make the options deliberately incomplete so explaining in their own words is the best answer.
   Keep each header short and concrete (it is shown in the instructions): "Edge case", "Trade-off", "Blast radius", "User impact".`

export const OPTION_RULES = `Give 2-4 options per question. Make every wrong option a mistake a reasonable reader could make (a real misconception, a plausible alternative design, a neighbouring wrong line), stated with a reason just as specific as the right one's. The right option must not stand out by length or precision, the classic give-away: keep every option's label plus description within about 15 characters of the others, and before sending, if the right one is the longest, shorten it or lengthen a wrong one. Vary its position; no "all of the above" or "none of the above". Do NOT mark the correct answer, add "(Recommended)", or hint at it in labels or descriptions.`

export const SKIPPED_QUIZ_RULE = `If the {{quizTool}} call comes back saying the user skipped the quiz, or they dismiss it, accept that and end the turn with one short line. Do not ask again.`

// {{lastRound}}: " the last round" for a quiz asked in rounds, else nothing.
export const GRADING_RULE = `After the user answers{{lastRound}}, grade every question and call {{resultsTool}} ONCE with all of them. It draws a playful scorecard (score, percentage, effects) for the user. Grade the reasoning, not the wording: a free-text answer with the core idea is correct; one with part of it, or the right pick for a stated wrong reason, is partial. A checkbox answer is correct only with every right option and no wrong one, partial with some right. Per question give:
   - question: a 2-6 word label ("Why the Stop fallback"),
   - verdict: correct | partial | incorrect,
   - user_answer: what they picked or wrote, short; correct_answer: the right answer, short,
   - punchline: ONE punchy line, 12 words max, vivid and specific to their answer. Praise a hit with energy ("Nailed it: the guard stops the double fire."); name a miss plainly ("Close, but reload wipes module vars, not the store."). No generic filler like "Great job!",
   - explanation: 1-2 tight sentences with the why, tied to the code, and the misconception if any. If their answer exposes a risk you missed, say so here instead of defending the change,
   - ref: file:line where it lives, when useful,
   - finding: ONLY when the question, or the user's answer, exposed a real bug or risk in the change itself: one line naming it and the input that triggers it. Leave it out otherwise; the scorecard flags every finding as a problem to fix.
   Also give next_step: one concrete action for their biggest gap (a line to read, a check to run, an input to try), never just "review the code".
   The scorecard IS the feedback: do not repeat it in your own text. After the tool returns, write at most one short line. If {{resultsTool}} is not available, give the same feedback as short text instead.`

export const NO_EDITS_RULE = `Do not edit any files during the quiz. If an answer exposes a real problem in the change, say so and propose a fix, but wait for the user's go-ahead.`
