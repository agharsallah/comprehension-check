// The angles each perspective asks from. `mixed` draws on all three
// (perspective.ts puts them into words).

import type { Perspective } from '../../config'

// `elsewhere`: what belongs to the other lenses, kept out of this one.
// `hunt`: what to look for in the diff before writing, so the quiz is built
// on the corner cases and unwanted behavior the change really has.
export type Lens = { name: string; focus: string; elsewhere: string; angles: readonly string[]; hunt?: string }

export const LENSES: Record<Exclude<Perspective, 'mixed'>, Lens> = {
  code: {
    name: 'Code',
    focus: 'how the change behaves, line by line',
    elsewhere: 'system design, deployment and user impact',
    angles: [
      'predict: the exact result of an added or changed line for a concrete input at its edge (empty, missing, zero, negative, a duplicate, exactly at a limit, one past it)',
      'find the input: which of several concrete inputs make the new code misbehave (a checkbox question fits), or the smallest input that does',
      'what breaks if a specific line, guard or condition is removed, reordered, inverted or moved off by one',
      'failure paths in the new code: a throw or rejection halfway through, the state it leaves behind, a retry, a timeout',
      'state across calls: the same call twice, two calls interleaved, a shared or module-level value, a mutated argument',
      'existing callers the diff did not touch: what they now get differently (a value, a type, an error, a delay)',
      'what the tests or checks prove, and which plausible bug in the new code they would still let through',
      'a decision Claude made, asked as what it makes a concrete call return or do, never as whether it was the right design',
    ],
    hunt: 'Before writing, review the diff as a reviewer hunting for bugs. Go through every added and changed line and try the edges on it: empty, missing (null, undefined, absent key), zero, negative, a duplicate, exactly at a limit and one past it, a throw or rejection halfway, the same call twice, and each existing caller of a changed function. Note every input that gives a wrong, surprising or unhandled result.',
  },
  architecture: {
    name: 'Architecture',
    focus: 'how the change fits the system',
    elsewhere: 'line-by-line results and user-facing impact',
    angles: [
      'why this design over a named alternative, and what it trades away',
      'boundaries and coupling: what now depends on what, where state lives, who owns it',
      'blast radius: what else must change in step, and what could break far from the diff',
      'behavior under load, concurrency, ordering or partial failure, and how reversible the change is',
      'unwanted behavior over time or at scale: growth with no bound, duplicates after a retry, old and new versions running side by side, a restart',
      'what the tests cannot show about the running system: other instances, real load, callers they skip',
    ],
    hunt: 'Before writing, look for unwanted behavior the change brings to the system, beyond what the diff shows: other callers and the data they pass, several instances or processes at once, a retry or a duplicate message, a partial failure between two steps, a deploy where old and new code run together, and growth over days of traffic. Note every case where the system would end up wrong, inconsistent or degraded.',
  },
  product: {
    name: 'Product',
    focus: 'what the change means for the people who use it',
    elsewhere: 'line-level mechanics and internal design with no user consequence',
    angles: [
      'what a user now sees or does differently, and which users it affects',
      "defaults, scope cuts and requirements Claude chose or reinterpreted on the user's behalf",
      'what was left out, and whether it is safe to ship without it',
      'how they would know it works for users, beyond a green test: what to try, measure or tell them',
    ],
  },
}
