// The templating every prompt uses: plain text with {{name}} slots, filled
// by `fill`. The slot names are read from the template's own type, so a
// missing or misspelt value is a type error, and a slot left without a value
// at run time throws instead of reaching Claude as "{{name}}".
//
// The names the mod shares across prompts (the tag, the tool names, the
// quiz limits) fill themselves: a template writes {{quizTool}} and the
// caller passes nothing for it.

import { CHECK_TOOL, LINES_PER_QUESTION, QUESTION_LIMITS, QUIZ_SOURCE, QUIZ_TOOL, RESULTS_TOOL, RESULTS_TOOL_NAME } from '../config'

// What every template may use without being given it.
export const SHARED_SLOTS = {
  tag: '[comprehension-check]',
  quizTool: QUIZ_TOOL,
  quizSource: QUIZ_SOURCE,
  resultsTool: RESULTS_TOOL,
  resultsToolName: RESULTS_TOOL_NAME,
  checkTool: CHECK_TOOL,
  perDialog: QUESTION_LIMITS.perDialog,
  linesPerQuestion: LINES_PER_QUESTION,
} as const

export type SlotValue = string | number

// The slot names in a template: "a {{x}} b {{y}}" → "x" | "y".
export type SlotsOf<T extends string> = T extends `${string}{{${infer Name}}}${infer Rest}` ? Name | SlotsOf<Rest> : never

// What `fill` needs for a template: a value for each slot but the shared ones.
export type SlotValues<T extends string> = { [Name in Exclude<SlotsOf<T>, keyof typeof SHARED_SLOTS>]: SlotValue }

// Any {{…}}, as SlotsOf reads it, so the type and the run agree on what a slot is.
const SLOT = /\{\{([^{}]+)\}\}/g

// The template with every slot replaced. One pass: a value that itself holds
// "{{x}}" (a file name, a model's words) is left as written.
export const fill = <T extends string>(template: T, values: SlotValues<T>): string => {
  const given: Record<string, SlotValue | undefined> = { ...SHARED_SLOTS, ...values }
  return template.replace(SLOT, (_, name: string) => {
    const value = given[name]
    if (value === undefined) throw new Error(`prompt template: no value for {{${name}}}`)
    return String(value)
  })
}

// "\n<marker>item" for each item, to follow a line that introduces them.
export const listed = (items: readonly string[], marker: string): string =>
  items.map(item => `\n${marker}${item}`).join('')

// "1. rule\n2. rule".
export const numbered = (rules: readonly string[]): string => rules.map((rule, i) => `${i + 1}. ${rule}`).join('\n')

// The text when the condition holds, else nothing: for an optional part.
export const when = (condition: boolean, text: string): string => (condition ? text : '')
