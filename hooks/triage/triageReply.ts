// The triage model's reply, read: "<reason> => QUIZ" or "<reason> => SKIP",
// as prompts/triage/system.ts asks, or the looser forms a model may still
// write. Pure.

export type TriageVerdict = {
  quiz: boolean
  // What decided it, in the model's few words; absent when no model
  // answered or it gave no reason.
  reason?: string
}

const MAX_REASON = 120

// "<reason> => QUIZ", the asked form: the verdict ends the line, after an
// arrow, in any case.
const ARROW_FORM = /^[\s*_`>-]*(.*?)[\s*_`]*(?:=>|->|→)[\s*_`]*\b(QUIZ|SKIP)\b[\s*_`.!]*$/i
// Forms a model may still write with no arrow: the verdict ending the line
// bare, or opening it ("QUIZ: <reason>"), in capitals or, opening it, in
// any case before a colon. A lowercase word with no arrow or colon is prose
// ("this touches auth, don't skip"), not a verdict.
const BARE_FORMS: { form: RegExp; word: number; reason: number }[] = [
  { form: /^[\s*_`>-]*(.*?)[\s*_`:—-]*\b(QUIZ|SKIP)\b[\s*_`.!]*$/, word: 2, reason: 1 },
  { form: /^[\s*_`#>-]*(QUIZ|SKIP)\b[\s*_`:.\-–—]*(.*)$/, word: 1, reason: 2 },
  { form: /^[\s*_`#>-]*(QUIZ|SKIP)[*_`]*:\s*(.*)$/i, word: 1, reason: 2 },
]
// Both verdicts on a line with no arrow ("QUIZ or SKIP?"): the choice
// echoed, not made.
const BOTH_VERDICTS = /\bQUIZ\b.*\bSKIP\b|\bSKIP\b.*\bQUIZ\b/

// At most MAX_REASON characters, cut at a word with "…" when longer.
const fitted = (text: string) => {
  if (text.length <= MAX_REASON) return text
  const cut = text.slice(0, MAX_REASON - 1)
  const lastSpace = cut.lastIndexOf(' ')
  return `${(lastSpace > MAX_REASON / 2 ? cut.slice(0, lastSpace) : cut).replace(/[\s,;:.-]+$/, '')}…`
}

// The prompt's own placeholder, echoed instead of a reason.
const PLACEHOLDER = /^<[^<>]*>$/

// The reason with no markdown around it and no closing punctuation (the
// sentences it goes into add their own), at most MAX_REASON characters.
const cleanReason = (text: string) => {
  const unmarked = text.replace(/^[\s*_`]+|[\s*_`]+$/g, '')
  if (PLACEHOLDER.test(unmarked)) return ''
  return fitted(unmarked.replace(/[\s:;,.!=>-]+$/, '').trim())
}

const verdictOf = (word: string | undefined, reason: string): TriageVerdict => {
  const cleaned = cleanReason(reason)
  return { quiz: word?.toUpperCase() === 'QUIZ', ...(cleaned === '' ? {} : { reason: cleaned }) }
}

// The verdict in the model's reply: from the first line that carries one,
// with markdown around it allowed. Undefined when no line does.
export const parseTriageReply = (text: string): TriageVerdict | undefined => {
  for (const line of text.split('\n')) {
    const arrow = ARROW_FORM.exec(line)
    if (arrow !== null) return verdictOf(arrow[2], arrow[1] ?? '')
    if (BOTH_VERDICTS.test(line)) continue
    for (const { form, word, reason } of BARE_FORMS) {
      const match = form.exec(line)
      if (match !== null) return verdictOf(match[word], match[reason] ?? '')
    }
  }
  return undefined
}
