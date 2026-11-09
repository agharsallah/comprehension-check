// The yes/no question before every quiz: "Ready for N quick questions?"

import type { EngineInterface } from 'claude-code'

import { GATE } from '../config'
import { clearGateInfo, showGateInfo } from './gateState'

const isYes = (answer: string | undefined) =>
  answer !== undefined && (answer === GATE.yes || GATE.yesWords.test(answer))

// True when the user wants the quiz now. Dismissing the dialog is a no.
// `questions` is the quiz's length, or 0 when it is not known yet. `why`:
// what makes the change worth a quiz, when the triage model said.
export async function askToStartQuiz(
  $: EngineInterface,
  files: string[],
  questions: number,
  why?: string,
): Promise<boolean> {
  // The banner above the dialog reads this.
  await showGateInfo($, { files, questions })
  let answer: string | undefined
  try {
    answer = await $.ui.ask(
      `🧠 Quiz time! Ready for ${questions || 'a few'} quick questions on what Claude just changed?${why === undefined ? '' : ` Worth a check: ${why}.`}`,
      { header: GATE.header, options: [GATE.yes, GATE.no] },
    )
  } catch {
    answer = undefined
  } finally {
    await clearGateInfo($)
  }
  return isYes(answer)
}
