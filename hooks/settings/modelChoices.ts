// The models the user may pick to write the quiz. Claude Code has no call
// that lists every model, so the list is the one an admin allowed
// (`availableModels` in its settings) when there is one, else the aliases
// the engine resolves to the latest model of each family. Any other model
// name or id can still be typed; the engine refuses one it cannot run, and
// Claude then writes the quiz itself.

import type { EngineInterface } from 'claude-code'

import { MODEL_ALIASES, SAME_AS_SESSION, WRITER } from '../config'

export type ModelSource = Pick<EngineInterface, 'settings'>

// A model name or id as `--model` takes it: "haiku", "claude-sonnet-5-5",
// "claude-opus-5-5[1m]", "us.anthropic.claude-haiku-5-5-v1:0".
const MODEL_NAME = /^[a-z0-9][a-z0-9._:@/[\]-]{0,99}$/i

export const isModelName = (word: string): boolean => MODEL_NAME.test(word) && word !== SAME_AS_SESSION

// A model the user typed: an alias, or a name that says it is a Claude
// model (as every Anthropic, Bedrock and Vertex id does), so a stray word
// typed in a dialog ("done") is not saved as a model.
export const isTypedModel = (word: string): boolean =>
  (MODEL_ALIASES as readonly string[]).includes(word) || (isModelName(word) && /claude/i.test(word))

// The models in an `availableModels` value: its model names, in order, once
// each. Anything else in it (a damaged value) is left out.
export const allowedModelsFrom = (stored: unknown): string[] =>
  Array.isArray(stored)
    ? [...new Set(stored.filter((m): m is string => typeof m === 'string').map(m => m.trim()).filter(isModelName))]
    : []

export async function modelChoices($: ModelSource): Promise<string[]> {
  let stored: unknown
  try {
    stored = await $.settings.read({ key: 'availableModels' })
  } catch {
    stored = undefined
  }
  const allowed = allowedModelsFrom(stored)
  return allowed.length > 0 ? allowed : [...MODEL_ALIASES]
}

// What the settings menu offers for the quiz model: the session's, then the
// first few models (a dialog holds 4 options; others are typed under Other).
export async function quizModelChoices($: ModelSource): Promise<string[]> {
  return [SAME_AS_SESSION, ...(await modelChoices($)).slice(0, WRITER.menuModels)]
}
