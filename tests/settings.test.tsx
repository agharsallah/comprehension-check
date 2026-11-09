// The settings menu: every setting in one list, Enter changes the one picked
// in place, and the list comes back until Esc.

import { expect, mock, test } from 'claude-code/testing'
import type { On } from 'claude-code'

const RUN = { origin: { kind: 'composer' }, presentation: { isFullscreen: false, columns: 100 } } as const
const quiz = (args: string) => ({ command: 'quiz', args, ...RUN })
const EDIT = { tool: 'Edit', file_path: '/repo/a.kt', old_string: 'a', new_string: 'b' } as const

type Asked = { header: string; question: string; options: string[] }

// Stands for the engine beneath the mod: answers the mod's dialogs with
// `answers` in order, then dismisses.
const engine = (on: On, answers: string[]) => {
  const asked: Asked[] = []
  const queue = [...answers]
  mock.store(on)
  on('tool.call', (_, e) => {
    if (e.tool !== 'AskUserQuestion') return { result: {} }
    const q = (e as { questions: { question: string; header: string; options: { label: string }[] }[] }).questions[0]
    asked.push({ header: q?.header ?? '', question: q?.question ?? '', options: (q?.options ?? []).map(o => o.label) })
    const answer = queue.shift()
    return answer === undefined ? { deny: 'dismissed' } : { result: { answers: { [q?.question ?? '']: answer } } }
  })
  on('classic.Stop', () => ({}))
  on('process.run', () => ({ value: { exitCode: 1, stdout: '', stderr: '', isStdoutTruncated: false, isStderrTruncated: false } }))
  on('command.register', () => ({ value: { command: 'quiz' } }))
  on('tool.register', (_, e) => ({ value: { tool: `mcp__comprehension-check__${e.name}` } }))
  on('agent.register', (_, e) => ({ value: { agent: `comprehension-check:${e.name}` } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  mock.session(on)
  return asked
}

const START = { cwd: '/repo', surface: 'terminal', isInteractive: true } as const

test('Enter on Sound or Length changes it in place, and the list comes back', async ($, on) => {
  const asked = engine(on, ['Sound: On', 'More settings…', 'Length: Claude decides', 'Done'])
  await $.session.start(START)

  const r = await $.command.run(quiz('settings'))
  expect(r.text).toContain(
    "Saved. Quiz settings: quiz on important changes · sound off · at most 4 questions · length fits the change size · mixed perspective · plain wording · quiz written on the session's model.",
  )

  expect(asked.map(a => a.header)).toEqual(['Settings', 'Settings', 'Settings', 'Settings'])
  expect(asked[0]?.options).toEqual(['Quiz on: Important changes', 'Sound: On', 'Max questions: 4', 'More settings…'])
  expect(asked[1]?.options[1]).toBe('Sound: Off')
  expect(asked[0]?.question).toContain('Claude weighs how severe and complex the change is')
  expect(asked[3]?.question).toContain('1 question per 100 changed lines')
})

test('Enter on Quiz on switches between important changes and every change', async ($, on) => {
  const asked = engine(on, ['Quiz on: Important changes', 'Quiz on: Every change', 'Done'])
  await $.session.start(START)

  const r = await $.command.run(quiz('settings'))
  expect(asked[1]?.options[0]).toBe('Quiz on: Every change')
  expect(asked[2]?.options[0]).toBe('Quiz on: Important changes')
  expect(r.text).toContain('quiz on important changes')
})

test('Max questions: pick a number, or type one under Other', async ($, on) => {
  const asked = engine(on, ['Max questions: 4', '6', 'Max questions: 6', '12', 'Max questions: 12', 'lots', 'Done'])
  await $.session.start(START)

  const r = await $.command.run(quiz('settings'))
  expect(r.text).toContain('at most 12 questions')
  expect(asked[1]?.options).toEqual(['2', '4 (current)', '6', '8'])
  expect(asked[3]?.question).toContain('Now 6')
})

test('Perspective lists every lens with what it asks, the current one marked', async ($, on) => {
  const asked = engine(on, ['More settings…', 'Perspective: Mixed', 'Product', 'Perspective: Product', 'Architecture', 'Done'])
  await $.session.start(START)

  const r = await $.command.run(quiz('settings'))
  expect(r.text).toContain('architecture perspective')
  expect(asked[2]?.header).toBe('Perspective')
  expect(asked[2]?.options).toEqual(['Mixed (current)', 'Code', 'Architecture', 'Product'])
  expect(asked[2]?.question).toContain('Product: What it means for users')
  // After a change the list comes back on the same page.
  expect(asked[3]?.options[1]).toBe('Perspective: Product')
  expect(asked[4]?.options).toContain('Product (current)')
})

test('Perspective: a lens typed under Other is understood; nonsense changes nothing', async ($, on) => {
  engine(on, ['More settings…', 'Perspective: Mixed', 'architect', 'Perspective: Architecture', 'sideways', 'Done'])
  await $.session.start(START)

  const r = await $.command.run(quiz('settings'))
  expect(r.text).toContain('architecture perspective')
})

test('Esc at once changes nothing and shows the one-line commands', async ($, on) => {
  engine(on, [])
  await $.session.start(START)
  const r = await $.command.run(quiz('settings'))
  expect(r.text).toContain('No changes')
  expect(r.text).toContain('/quiz settings max 1-99')
})

test('the settings dialogs do not count as a quiz', async ($, on) => {
  engine(on, ['Sound: On', 'Done'])
  await $.session.start(START)

  await $.tool.call({ ...EDIT, file_path: '/repo/owed.kt' })
  await $.command.run(quiz('settings'))
  const r = await $.classic.Stop({ stop_hook_active: false })
  expect(r.block).toContain('/repo/owed.kt')
})

test('More settings… turns the pages: Length, Perspective, Wording, then Quiz model and Back', async ($, on) => {
  const asked = engine(on, ['More settings…', 'Wording: Plain', 'More settings…', 'Back', 'Done'])
  await $.session.start(START)

  const r = await $.command.run(quiz('settings'))
  expect(r.text).toContain('standard wording')
  expect(asked[1]?.options).toEqual(['Length: Claude decides', 'Perspective: Mixed', 'Wording: Plain', 'More settings…'])
  // Enter switched the wording in place, on the same page.
  expect(asked[2]?.options).toEqual(['Length: Claude decides', 'Perspective: Mixed', 'Wording: Standard', 'More settings…'])
  expect(asked[3]?.options).toEqual(['Quiz model: Same as session', 'Back'])
  // Back returns to the first page.
  expect(asked[4]?.options[3]).toBe('More settings…')
})

// The menu's third page, opened, then the Quiz model row picked.
const TO_QUIZ_MODEL = ['More settings…', 'More settings…', 'Quiz model: Same as session']

test("Quiz model lists Claude Code's allowed models when it has a list", async ($, on) => {
  const asked = engine(on, [...TO_QUIZ_MODEL, 'claude-haiku-5-5', 'Done'])
  on('settings.read', () => ({ value: { availableModels: ['claude-haiku-5-5', 'claude-sonnet-5-5', 42, 'claude-haiku-5-5'] } }))
  await $.session.start(START)

  const r = await $.command.run(quiz('settings'))
  expect(asked[3]?.header).toBe('Quiz model')
  // A damaged entry and a repeat are left out.
  expect(asked[3]?.options).toEqual(['Same as session (current)', 'claude-haiku-5-5', 'claude-sonnet-5-5'])
  expect(asked[3]?.question).toContain('A claude-haiku-5-5 subagent writes the quiz at medium effort')
  expect(asked[4]?.options[0]).toBe('Quiz model: claude-haiku-5-5')
  expect(r.text).toContain('quiz written by claude-haiku-5-5')
})

test('Quiz model offers the model aliases when no list is set, and takes any model typed under Other', async ($, on) => {
  const asked = engine(on, [...TO_QUIZ_MODEL, 'claude-opus-5-5[1m]', 'Done'])
  on('settings.read', () => ({ value: {} }))
  await $.session.start(START)

  const r = await $.command.run(quiz('settings'))
  expect(asked[3]?.options).toEqual(['Same as session (current)', 'haiku', 'sonnet', 'opus'])
  expect(r.text).toContain('quiz written by claude-opus-5-5[1m]')
})

test('Quiz model: a settings read that fails still offers the aliases', async ($, on) => {
  const asked = engine(on, [...TO_QUIZ_MODEL])
  on('settings.read', () => {
    throw new Error('settings unreadable')
  })
  await $.session.start(START)

  await $.command.run(quiz('settings'))
  expect(asked[3]?.options).toEqual(['Same as session (current)', 'haiku', 'sonnet', 'opus'])
})

test('Quiz model: a stray word typed under Other is not saved as a model', async ($, on) => {
  engine(on, [...TO_QUIZ_MODEL, 'Done'])
  on('settings.read', () => ({ value: {} }))
  await $.session.start(START)

  const r = await $.command.run(quiz('settings'))
  expect(r.text).toContain('No changes.')
  expect(r.text).toContain("quiz written on the session's model")
})
