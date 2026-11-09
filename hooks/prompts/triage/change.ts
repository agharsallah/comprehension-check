// The user message of the triage call: the change, as data inside <change>
// tags. triage/triageMessage.ts fills it, and triage/excerpts.ts writes each
// edit's excerpt with the markers below.

export const CHANGE_MESSAGE = `<change>
Files changed (lines changed):
{{fileRows}}

Edits, oldest first (- removed, + added):
{{edits}}
</change>`

// One row of the file list.
export const FILE_ROW = '- {{path}} ({{lines}})'

export const MORE_FILES_ROW = '- … and {{count}} more files'

// One edit, under the file it changed.
export const EDIT_BLOCK = '### {{path}}\n{{excerpt}}'

export const MORE_EDITS = '… {{count}} more {{edits}} not shown'

export const NO_EXCERPT = '(no excerpt)'

// Inside an excerpt.
export const WHOLE_FILE_WRITTEN = '(whole file written)'

export const NOTEBOOK_CELL_DELETED = '(notebook cell deleted)'

export const LINES_CUT = '… {{count}} more {{lines}} cut'
