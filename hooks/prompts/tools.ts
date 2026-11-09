// What Claude reads about the mod's own tools: their descriptions, and the
// scorecard tool's replies.

import { fill } from './template'

export const CHECK_TOOL_DESCRIPTION =
  'Call once when a comprehension-check note tells you to, after all your code changes for the request are done. Says whether the change needs a comprehension quiz and, if so, how to ask it.'

export const RESULTS_TOOL_DESCRIPTION =
  'Show the user a scorecard for the comprehension quiz you just graded. Call once, right after the user answers the quiz questions.'

const RESULTS_REFUSED = '{{resultsToolName}} needs a non-empty "results" array with a valid verdict on each item.'

const SCORECARD_SHOWN =
  'Scorecard shown to the user: {{pct}}% ({{points}}/{{questions}}). It already shows every verdict, punchline and explanation, so do not repeat them. Close with at most one short line.'

// The reply to a scorecard call with no usable results.
export const resultsRefusedReply = fill(RESULTS_REFUSED, {})

// The reply once the scorecard is on screen.
export const scorecardShownReply = (pct: number, points: number, questions: number) =>
  fill(SCORECARD_SHOWN, { pct, points, questions })
