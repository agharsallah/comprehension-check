// What one edit tool call changed, as a short excerpt for the triage model:
// removed lines as "- ", added lines as "+ ", cut at a length. Pure: the
// words are in prompts/triage/change.ts.

import { plural } from '../lib/text'
import { asRecord } from '../lib/values'
import { LINES_CUT, NOTEBOOK_CELL_DELETED, WHOLE_FILE_WRITTEN } from '../prompts/triage/change'
import { fill } from '../prompts/template'

const lines = (text: unknown): string[] => (typeof text === 'string' && text !== '' ? text.split('\n') : [])

const marked = (mark: '-' | '+', text: unknown) => lines(text).map(line => `${mark} ${line}`)

// The most characters kept of any one line, so a minified file or a long
// string still shows its start instead of crowding out every other line.
export const MAX_LINE_CHARS = 200

const shortLine = (row: string) => (row.length <= MAX_LINE_CHARS ? row : `${row.slice(0, MAX_LINE_CHARS - 1)}…`)

// Lines up to `maxChars` in all, each at most MAX_LINE_CHARS; past the
// total, one line says how many were cut.
export const cutToLength = (rows: readonly string[], maxChars: number): string => {
  const kept: string[] = []
  let used = 0
  for (const row of rows.map(shortLine)) {
    if (used + row.length + 1 > maxChars) break
    kept.push(row)
    used += row.length + 1
  }
  const cut = rows.length - kept.length
  return cut === 0 ? kept.join('\n') : [...kept, fill(LINES_CUT, { count: cut, lines: plural(cut, 'line') })].join('\n')
}

// The excerpt of an Edit, Write or NotebookEdit call; '' for anything else
// or an edit that carries no text.
export const excerptOf = (input: unknown, maxChars: number): string => {
  const rec = asRecord(input)
  let rows: string[]
  switch (rec?.tool) {
    case 'Edit':
      rows = [...marked('-', rec.old_string), ...marked('+', rec.new_string)]
      break
    case 'Write':
      rows = lines(rec.content).length === 0 ? [] : [WHOLE_FILE_WRITTEN, ...marked('+', rec.content)]
      break
    case 'NotebookEdit':
      rows = rec.edit_mode === 'delete' ? [NOTEBOOK_CELL_DELETED] : marked('+', rec.new_source)
      break
    default:
      rows = []
  }
  return cutToLength(rows, maxChars)
}
