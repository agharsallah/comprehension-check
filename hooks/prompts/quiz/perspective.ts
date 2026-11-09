// The perspective rule of the quiz instructions: which angles the questions
// take, from the lenses in lenses.ts, and the bug hunt that comes first.

import type { Perspective } from '../../config'
import { fill, listed, when } from '../template'
import { LENSES } from './lenses'
import type { Lens } from './lenses'

// What to do with what the hunt found. The question puts the finding to the
// user without naming it, so they have to find it themselves.
export const HUNT_USE = `Build at least one question on the most serious finding: give the concrete input or situation and ask what happens, or ask which input or situation breaks it. Do not say in the question that it is a bug; the user should spot it. If you find nothing wrong, ask about the case that comes closest to breaking. A finding that is a real bug goes in that question's \`finding\` field on the scorecard, and in your one line after it, with an offer to fix it.`

const HUNT_RULE = '\n   {{hunts}} {{huntUse}}'

const MIXED_PERSPECTIVE =
  'Perspective: mixed. Pick the angles this change actually carries; with 2 or more questions, use at least two lenses.{{lenses}}{{hunt}}'

const MIXED_LENS = '\n   {{name}} ({{focus}}):{{angles}}'

const ONE_PERSPECTIVE =
  'Perspective: {{name}}. The user chose to be quizzed on {{focus}}, so EVERY question takes this angle, including the riskiest-part, decision and test questions below. {{elsewhere}} belong to other perspectives: leave them out unless you can ask them as a {{nameLower}} question. If the change barely touches this angle, ask how it could still reach it rather than switching angle. Good angles:{{angles}}{{hunt}}'

const capitalized = (text: string) => `${text[0]?.toUpperCase() ?? ''}${text.slice(1)}`

// The hunts of the lenses that have one, and what to do with the findings.
const huntRule = (lenses: readonly Lens[]): string => {
  const hunts = lenses.flatMap(lens => (lens.hunt === undefined ? [] : [lens.hunt]))
  return when(hunts.length > 0, fill(HUNT_RULE, { hunts: hunts.join(' '), huntUse: HUNT_USE }))
}

export const perspectiveRule = (perspective: Perspective): string => {
  if (perspective === 'mixed') {
    const all = Object.values(LENSES)
    const lenses = all
      .map(lens => fill(MIXED_LENS, { name: lens.name, focus: lens.focus, angles: listed(lens.angles, '     - ') }))
      .join('')
    return fill(MIXED_PERSPECTIVE, { lenses, hunt: huntRule(all) })
  }
  const lens = LENSES[perspective]
  return fill(ONE_PERSPECTIVE, {
    name: lens.name,
    nameLower: lens.name.toLowerCase(),
    focus: lens.focus,
    elsewhere: capitalized(lens.elsewhere),
    angles: listed(lens.angles, '   - '),
    hunt: huntRule([lens]),
  })
}
