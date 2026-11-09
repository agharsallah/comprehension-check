// The scorecard tool Claude calls after grading: it scores the quiz, keeps
// the stats, and plays the effects. The drawing is in scorecardView.tsx.

import type { EngineInterface, On } from 'claude-code'

import { RESULTS_TOOL, RESULTS_TOOL_NAME } from '../config'
import { pickStable } from '../lib/text'
import { RESULTS_TOOL_DESCRIPTION, resultsRefusedReply, scorecardShownReply } from '../prompts/tools'
import type { QuizRounds } from '../quiz/quizRounds'
import { readSettings } from '../settings/settings'
import { RESULTS_SCHEMA, parseResults, scoreOf, tierFor } from './grading'
import { saveCardStats, startCountUp } from './scorecardState'
import { recordQuizScore } from './stats'

// The registered tool is unknown to the generated types, so it is matched by pattern.
export const RESULTS_TOOL_MATCH = new RegExp(`^${RESULTS_TOOL}$`)

export async function defineResultsTool($: EngineInterface) {
  await $.tool.register({
    name: RESULTS_TOOL_NAME,
    description: RESULTS_TOOL_DESCRIPTION,
    inputSchema: RESULTS_SCHEMA,
    isDeferred: false,
  })
}

export function registerResultsTool(on: On, rounds: QuizRounds) {
  // Showing the scorecard needs no permission.
  on('tool.check', { tool: RESULTS_TOOL_MATCH }, async () => ({ decision: 'allow' as const }))

  on('tool.call', { tool: RESULTS_TOOL_MATCH }, async ($, e) => {
    const parsed = parseResults(e)
    if (parsed === undefined) return { deny: resultsRefusedReply }
    // Graded: the next quiz call starts a new quiz.
    rounds.end()
    const { points, pct } = scoreOf(parsed.results)
    const id = e.tool_use_id ?? ''

    const stats = await recordQuizScore($, pct)
    await saveCardStats($, id, stats)
    await startCountUp($, id)

    const tier = tierFor(pct)
    $.ui.toast(`${tier.emoji} ${pct}% on the quiz. ${pickStable(tier.lines, id)}`)
    if ((await readSettings($)).sound) {
      void $.audio.play({ asset: tier.sound }).catch(() => undefined)
    }

    return { result: scorecardShownReply(pct, points, parsed.results.length) }
  })
}
