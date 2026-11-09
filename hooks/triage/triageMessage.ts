// The user message of the triage call: the files with their line counts,
// then the edits, within a budget, on short paths. Pure: the text is in
// prompts/triage/change.ts, the call in triage.ts.

import { largestFirst } from '../changes/changeSets'
import type { Changes, EditExcerpt } from '../changes/changeTracker'
import { plural } from '../lib/text'
import { CHANGE_MESSAGE, EDIT_BLOCK, FILE_ROW, MORE_EDITS, MORE_FILES_ROW, NO_EXCERPT } from '../prompts/triage/change'
import { fill, when } from '../prompts/template'

// Files named in the message, largest first; the rest are counted.
const LISTED_FILES = 30

// The folder every path shares, so the message carries short paths.
export const commonFolder = (paths: readonly string[]): string => {
  if (paths.length === 0) return ''
  const split = paths.map(path => path.split('/').slice(0, -1))
  const first = split[0] ?? []
  let shared = 0
  while (shared < first.length && split.every(parts => parts[shared] === first[shared])) shared += 1
  return shared === 0 ? '' : `${first.slice(0, shared).join('/')}/`
}

// Folders of the shared prefix kept on every path: `src/payments/` says
// more about a change than `capture.ts` alone.
const KEPT_FOLDERS = 2

// What to cut off the front of every path: the shared folder less its last
// KEPT_FOLDERS folders.
export const pathPrefixToDrop = (paths: readonly string[]): string => {
  const parts = commonFolder(paths).split('/').filter(part => part !== '')
  if (parts.length <= KEPT_FOLDERS) return ''
  const leading = paths[0]?.startsWith('/') === true ? '/' : ''
  return `${leading}${parts.slice(0, parts.length - KEPT_FOLDERS).join('/')}/`
}

// An excerpt cannot close the <change> tag early.
const fenced = (text: string) => text.replaceAll('</change>', '<\\/change>')

// The files, largest first, the ones past LISTED_FILES counted.
const fileRows = (changes: Changes, short: (path: string) => string): string[] => {
  const files = largestFirst(changes)
  const rows = files
    .slice(0, LISTED_FILES)
    .map(([path, n]) => fill(FILE_ROW, { path: short(path), lines: `${n} ${plural(n, 'line')}` }))
  const more = files.length - LISTED_FILES
  return more > 0 ? [...rows, fill(MORE_FILES_ROW, { count: more })] : rows
}

// The edits, oldest first, until `maxChars`; the ones past it counted.
const editBlocks = (excerpts: readonly EditExcerpt[], maxChars: number, short: (path: string) => string): string[] => {
  const blocks: string[] = []
  let used = 0
  for (const excerpt of excerpts) {
    const block = fill(EDIT_BLOCK, { path: short(excerpt.path), excerpt: fenced(excerpt.text) })
    if (used + block.length > maxChars) break
    blocks.push(block)
    used += block.length
  }
  const notShown = excerpts.length - blocks.length
  const more = when(notShown > 0, fill(MORE_EDITS, { count: notShown, edits: plural(notShown, 'edit') }))
  return more === '' ? blocks : [...blocks, more]
}

export const triageMessage = (changes: Changes, excerpts: readonly EditExcerpt[], maxChars: number): string => {
  const folder = pathPrefixToDrop([...changes.keys(), ...excerpts.map(e => e.path)])
  const short = (path: string) => (folder !== '' && path.startsWith(folder) ? path.slice(folder.length) : path)
  const edits = editBlocks(excerpts, maxChars, short)
  return fill(CHANGE_MESSAGE, {
    fileRows: fileRows(changes, short).join('\n'),
    edits: edits.length === 0 ? NO_EXCERPT : edits.join('\n\n'),
  })
}
