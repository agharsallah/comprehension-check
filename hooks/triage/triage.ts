// Whether the change as it stands deserves a quiz, asked of a fast model once
// per state of the change. Used when quizzes come only for important changes
// (Settings.trigger): by the check tool Claude calls when its edits are done,
// and by the Stop hook when Claude ends the turn without calling it.
//
// When no verdict comes back (an API error, a timeout, a reply in no known
// form), the change gets the quiz: the user can still say no at the gate,
// while a missed quiz on an important change cannot be taken back.

import type { EngineInterface } from 'claude-code'

import { TRIAGE } from '../config'
import type { ChangeTracker } from '../changes/changeTracker'
import { TRIAGE_SYSTEM } from '../prompts/triage/system'
import { triageMessage } from './triageMessage'
import { parseTriageReply } from './triageReply'
import type { TriageVerdict } from './triageReply'

export type { TriageVerdict } from './triageReply'

// The verdict on one state of the change, so asking again (the check tool,
// then the Stop hook) costs no second call.
export class TriageMemo {
  private last: { revision: number; verdict: TriageVerdict } | undefined

  at(revision: number): TriageVerdict | undefined {
    return this.last?.revision === revision ? this.last.verdict : undefined
  }

  // Why the change at `revision` is worth a quiz, when the model said it is.
  quizReasonAt(revision: number): string | undefined {
    const verdict = this.at(revision)
    return verdict?.quiz === true ? verdict.reason : undefined
  }

  remember(revision: number, verdict: TriageVerdict): void {
    this.last = { revision, verdict }
  }
}

// What a change gets when no verdict comes back: the quiz.
const FAIL_OPEN: TriageVerdict = { quiz: true }

async function askTriageModel($: Pick<EngineInterface, 'model'>, changes: ChangeTracker): Promise<TriageVerdict> {
  try {
    const reply = await $.model.complete({
      model: TRIAGE.model,
      system: TRIAGE_SYSTEM,
      prompt: triageMessage(changes.current, changes.excerpts, TRIAGE.maxChars),
      maxTokens: TRIAGE.maxTokens,
      effort: TRIAGE.effort,
      timeoutMs: TRIAGE.timeoutMs,
    })
    return reply.isAnswered ? (parseTriageReply(reply.text) ?? FAIL_OPEN) : FAIL_OPEN
  } catch {
    return FAIL_OPEN
  }
}

// The verdict on the pending changes, asked once per revision.
export async function judgeChange(
  $: Pick<EngineInterface, 'model'>,
  changes: ChangeTracker,
  memo: TriageMemo,
): Promise<TriageVerdict> {
  // Read before the call: an edit can land while the model answers.
  const revision = changes.revision
  const known = memo.at(revision)
  if (known !== undefined) return known
  const verdict = await askTriageModel($, changes)
  memo.remember(revision, verdict)
  // The verdict is about a change that has since grown: a SKIP would drop
  // edits the model never saw.
  return changes.revision === revision ? verdict : FAIL_OPEN
}

// The change needs no quiz: forget it, and tell the user why in passing.
export async function skipRoutineChange($: Pick<EngineInterface, 'ui'>, changes: ChangeTracker, verdict: TriageVerdict) {
  changes.forget()
  $.ui.toast(`🧠 No quiz this time${verdict.reason === undefined ? '' : `: ${verdict.reason}`}`)
}
