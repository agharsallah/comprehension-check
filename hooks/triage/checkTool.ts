// The check tool Claude calls once its edits are done, when quizzes come only
// for important changes: it asks the triage model about the change and
// answers with the quiz instructions, or with "no quiz". The Stop hook in
// quiz/quizFlow.ts is the fallback for a turn that ends without calling it.

import type { EngineInterface, On } from 'claude-code'

import { CHECK_TOOL, CHECK_TOOL_NAME } from '../config'
import type { ChangeTracker } from '../changes/changeTracker'
import { checkNothingReply, checkQuizReply, checkSkipReply } from '../prompts/checkReplies'
import { CHECK_TOOL_DESCRIPTION } from '../prompts/tools'
import { questionCountFor } from '../quiz/questionCount'
import { isQuizEnabled, readSettings } from '../settings/settings'
import { judgeChange, skipRoutineChange } from './triage'
import type { TriageMemo } from './triage'

// The registered tool is unknown to the generated types, so it is matched by pattern.
export const CHECK_TOOL_MATCH = new RegExp(`^${CHECK_TOOL}$`)

export type CheckToolDeps = { changes: ChangeTracker; memo: TriageMemo }

export async function defineCheckTool($: EngineInterface) {
  await $.tool.register({
    name: CHECK_TOOL_NAME,
    description: CHECK_TOOL_DESCRIPTION,
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    isDeferred: false,
  })
}

// What the tool tells Claude to do now.
async function checkReply($: EngineInterface, { changes, memo }: CheckToolDeps): Promise<string> {
  if (!changes.hasPending()) return checkNothingReply('no-change')
  if (!(await isQuizEnabled($))) return checkNothingReply('off')
  const settings = await readSettings($)
  const count = questionCountFor(settings, changes.current)
  if (settings.trigger === 'always') return checkQuizReply(count, settings)
  const verdict = await judgeChange($, changes, memo)
  if (verdict.quiz) return checkQuizReply(count, settings, verdict.reason)
  await skipRoutineChange($, changes, verdict)
  return checkSkipReply(verdict.reason)
}

export function registerCheckTool(on: On, deps: CheckToolDeps) {
  // Asking whether to quiz needs no permission.
  on('tool.check', { tool: CHECK_TOOL_MATCH }, async () => ({ decision: 'allow' as const }))

  on('tool.call', { tool: CHECK_TOOL_MATCH }, async $ => ({ result: await checkReply($, deps) }))
}
