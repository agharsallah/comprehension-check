// Reading and saving the user's quiz settings in the mod's store. What each
// setting is lives in definitions.ts.

import type { EngineInterface } from 'claude-code'

import { COMMAND_NAME, STORE_KEYS } from '../config'
import { SETTING_DEFINITIONS, findSetting } from './definitions'
import type { SettingDefinition, SettingValue, Settings } from './definitions'

export type { Settings } from './definitions'

type SettingsStore = Pick<EngineInterface, 'store'>

// The stored value; one that is not valid (or none stored) is the default.
async function storedValue($: SettingsStore, def: SettingDefinition): Promise<SettingValue> {
  return def.fromStore(await $.store.get(def.storeKey)) ?? def.defaultValue
}

export async function readSettings($: SettingsStore): Promise<Settings> {
  const entries = await Promise.all(SETTING_DEFINITIONS.map(async def => [def.key, await storedValue($, def)] as const))
  return Object.fromEntries(entries) as Settings
}

// Saves one value and says so.
export async function saveValue($: SettingsStore, def: SettingDefinition, value: SettingValue): Promise<string> {
  await $.store.set(def.storeKey, value)
  return def.saved(value)
}

// One setting from words, as typed after `/quiz settings`. Undefined when the
// setting or the value is unknown.
export async function saveSettingFromWords($: SettingsStore, name: string, word: string): Promise<string | undefined> {
  const def = findSetting(name)
  const value = def?.parse(word.trim().toLowerCase())
  return def === undefined || value === undefined ? undefined : saveValue($, def, value)
}

export const summaryOf = (settings: Settings): string =>
  `Quiz settings: ${SETTING_DEFINITIONS.map(def => def.summary(settings[def.key])).join(' · ')}.`

export const SETTINGS_USAGE = `Change one with ${SETTING_DEFINITIONS.map(
  def => `/${COMMAND_NAME} settings ${def.names[0]} ${def.usage}`,
).join(', ')}.`

// ─── On and off, per project ────────────────────────────────────────────────
//
// One global switch (STORE_KEYS.enabled, on unless set off) and, under
// STORE_KEYS.enabledProjects, a switch per project keyed by its git top
// level. A project's own switch wins; a project without one follows the
// global switch. Outside a git repository only the global switch applies.

type SwitchHost = Pick<EngineInterface, 'store' | 'process'>

export type ProjectSwitches = Record<string, boolean>

// The git top level of the session's folder, or undefined outside a repo.
export async function projectRoot($: Pick<EngineInterface, 'process'>): Promise<string | undefined> {
  try {
    const ran = await $.process.run(['git', '-c', 'core.quotePath=false', 'rev-parse', '--show-toplevel'], { stdin: '', timeoutMs: 5000 })
    const root = ran.stdout.trim()
    return ran.exitCode === 0 && root !== '' ? root : undefined
  } catch {
    return undefined
  }
}

// Only the entries whose value is a boolean: a damaged store reads as none.
export const projectSwitchesFrom = (stored: unknown): ProjectSwitches => {
  if (typeof stored !== 'object' || stored === null || Array.isArray(stored)) return {}
  return Object.fromEntries(Object.entries(stored).filter(([, on]) => typeof on === 'boolean')) as ProjectSwitches
}

// Pure: a project's own switch, else the global one.
export const resolveEnabled = (global: boolean, projects: ProjectSwitches, root: string | undefined): boolean =>
  root !== undefined && root in projects ? (projects[root] as boolean) : global

export type QuizSwitchState = { enabled: boolean; global: boolean; root: string | undefined; ownSwitch: boolean }

export async function readQuizSwitch($: SwitchHost): Promise<QuizSwitchState> {
  const [stored, projects, root] = await Promise.all([
    $.store.get(STORE_KEYS.enabled),
    $.store.get(STORE_KEYS.enabledProjects).then(projectSwitchesFrom),
    projectRoot($),
  ])
  const global = stored !== false
  return { enabled: resolveEnabled(global, projects, root), global, root, ownSwitch: root !== undefined && root in projects }
}

export async function isQuizEnabled($: SwitchHost): Promise<boolean> {
  return (await readQuizSwitch($)).enabled
}

// `/quiz on|off`: this project only. Returns the project changed, or
// undefined outside a git repository, where nothing is saved.
export async function setProjectQuizEnabled($: SwitchHost, isOn: boolean): Promise<string | undefined> {
  const root = await projectRoot($)
  if (root === undefined) return undefined
  const projects = projectSwitchesFrom(await $.store.get(STORE_KEYS.enabledProjects))
  await $.store.set(STORE_KEYS.enabledProjects, { ...projects, [root]: isOn })
  return root
}

// `/quiz on|off all`: every project. It clears each project's own switch, so
// "all" means all.
export async function setQuizEnabled($: Pick<EngineInterface, 'store'>, isOn: boolean): Promise<void> {
  await $.store.set(STORE_KEYS.enabled, isOn)
  await $.store.set(STORE_KEYS.enabledProjects, {})
}
