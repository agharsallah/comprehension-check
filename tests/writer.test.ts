// A model picked to write the quiz: the setting, the model list, the hand-off
// instructions, and the quiz-writer subagent the mod starts on that model.

import { expect, mock, test } from 'claude-code/testing'
import type { AgentSpawnInput, On } from 'claude-code'
import type { Engine } from 'claude-code/testing'

import { WRITER, WRITER_AGENT } from '../hooks/config'
import { quizInstructions } from '../hooks/prompts/quiz/instructions'
import { writerSystem, writerTask } from '../hooks/prompts/writer/writerAgent'
import type { QuestionCount } from '../hooks/quiz/questionCount'
import { findSetting } from '../hooks/settings/definitions'
import { allowedModelsFrom, isModelName, isTypedModel } from '../hooks/settings/modelChoices'

// ─── Pure parts ──────────────────────────────────────────────────────────────

test('model names: what a setting may hold, and what a user may type', async () => {
  for (const name of ['haiku', 'claude-sonnet-5-5', 'claude-opus-5-5[1m]', 'us.anthropic.claude-haiku-5-5-v1:0', 'claude-haiku@20261001']) {
    expect(isModelName(name)).toBe(true)
    expect(isTypedModel(name)).toBe(true)
  }
  // A gateway's own name: allowed in a list an admin set, not typed by hand.
  expect(isModelName('my-gateway-model')).toBe(true)
  expect(isTypedModel('my-gateway-model')).toBe(false)
  for (const bad of ['', 'session', 'two words', '-flag', 'x'.repeat(101), 'done', 'on']) expect(isTypedModel(bad)).toBe(false)
})

test('allowed models: model names only, in order, once each', async () => {
  expect(allowedModelsFrom(['claude-haiku-5-5', ' claude-sonnet-5-5 ', 'claude-haiku-5-5', 3, null, ''])).toEqual([
    'claude-haiku-5-5',
    'claude-sonnet-5-5',
  ])
  expect(allowedModelsFrom(undefined)).toEqual([])
  expect(allowedModelsFrom('haiku')).toEqual([])
  expect(allowedModelsFrom({ haiku: true })).toEqual([])
})

test('the quiz model setting: parsed from words, read from the store, said back', async () => {
  const def = findSetting('model')
  expect(def?.key).toBe('quizModel')
  expect(findSetting('writer')).toBe(def)
  expect(def?.defaultValue).toBe('session')
  for (const word of ['session', 'same', 'default', 'claude']) expect(def?.parse(word)).toBe('session')
  expect(def?.parse('haiku')).toBe('haiku')
  expect(def?.parse('claude-haiku-5-5')).toBe('claude-haiku-5-5')
  expect(def?.parse('lots')).toBeUndefined()
  expect(def?.fromStore('claude-haiku-5-5')).toBe('claude-haiku-5-5')
  expect(def?.fromStore('session')).toBe('session')
  for (const bad of [42, '', 'two words', null]) expect(def?.fromStore(bad)).toBeUndefined()
  expect(def?.label('session')).toBe('Same as session')
  expect(def?.label('haiku')).toBe('haiku')
  expect(def?.summary('haiku')).toBe('quiz written by haiku')
  expect(def?.saved('haiku')).toContain(`in a subagent at ${WRITER.effort} effort`)
  expect(def?.step('session', 1)).toBe('haiku')
  expect(def?.step('claude-opus-5-5', 1)).toBe('session')
})

const AGENT: QuestionCount = { mode: 'agent', max: 4 }
const LONG: QuestionCount = { mode: 'size', exact: 9, files: 3, lines: 900 }
const STYLE = { perspective: 'code', wording: 'plain' } as const

test('on the session model, the quiz instructions are what they were', async () => {
  expect(quizInstructions(AGENT, { ...STYLE, quizModel: 'session' })).toBe(quizInstructions(AGENT, STYLE))
})

test('with a model picked, Claude hands the writing off and keeps the asking and the grading', async () => {
  const handOff = quizInstructions(AGENT, { ...STYLE, quizModel: 'haiku' })
  expect(handOff).toContain(`subagent_type "${WRITER_AGENT}"`)
  expect(handOff).toContain('do not write the questions yourself')
  expect(handOff).toContain('every decision behind the change that the user did not ask for')
  expect(handOff).toContain('word for word')
  expect(handOff).toContain('do not send it back to the agent')
  expect(handOff).toContain('Pass metadata: {"source": "comprehension-check"}')
  expect(handOff).toContain('The mod first asks the user whether they want the quiz')
  expect(handOff).toContain("Grade against the agent's `answer_key`")
  expect(handOff).toContain('call mcp__comprehension-check__quiz_results ONCE')
  expect(handOff).toContain('If the agent fails')
  expect(handOff).toContain('Do not edit any files during the quiz')
  // The writing rules travel to the subagent, not through Claude's context.
  expect(handOff).not.toContain('Perspective:')
  expect(handOff).not.toContain('Give 2-4 options per question. Make every wrong option')
  expect(handOff.length).toBeLessThan(quizInstructions(AGENT, STYLE).length / 2)
})

test('the hand-off: plain wording for the scorecard, rounds for a long quiz, no gate when asked for', async () => {
  expect(quizInstructions(AGENT, { ...STYLE, quizModel: 'haiku' })).toContain('Wording: plain.')
  expect(quizInstructions(AGENT, { ...STYLE, wording: 'standard', quizModel: 'haiku' })).not.toContain('Wording: plain.')
  const long = quizInstructions(LONG, { ...STYLE, quizModel: 'haiku' })
  expect(long).toContain('ask them in rounds')
  expect(long).toContain('After the user answers the last round')
  const asked = quizInstructions(AGENT, { ...STYLE, quizModel: 'haiku' }, { requested: true })
  expect(asked).toContain('The user asked for this quiz, so it goes straight to them')
})

test("the writer's rules: the quiz rules every quiz keeps, and one JSON object back", async () => {
  const system = writerSystem()
  expect(system).toContain("The goal is the user's critical thinking")
  expect(system).toContain('Every question must:')
  expect(system).toContain('mix the formats')
  expect(system).toContain('Give 2-4 options per question')
  expect(system).toContain('"answer_key"')
  expect(system).toContain('change no file')
  expect(system).toContain("argues FOR its label")
  expect(system).toContain('"free_text"')
  expect(system).not.toMatch(/\{\{[^{}]+\}\}/)
})

test("the writer's task: Claude's brief, then the user's settings", async () => {
  const task = writerTask('  Files: src/http.ts. Decision: 3 attempts.  ', LONG, STYLE)
  expect(task.startsWith('Files: src/http.ts. Decision: 3 attempts.\n\n---\n')).toBe(true)
  expect(task).toContain('1. Write exactly 9 questions')
  expect(task).toContain('Perspective: Code.')
  expect(task).toContain('Wording: plain.')
  expect(writerTask('b', AGENT, { perspective: 'mixed', wording: 'standard' })).not.toContain('Wording: plain.')
})

// ─── Through the engine ──────────────────────────────────────────────────────

const RUN = { origin: { kind: 'composer' }, presentation: { isFullscreen: false, columns: 100 } } as const
const START = { cwd: '/', surface: 'terminal', isInteractive: true } as const
const EDIT = { tool: 'Edit', file_path: '/repo/auth.ts', old_string: 'a && b', new_string: 'a || b' } as const
const CHECK_TOOL = 'mcp__comprehension-check__quiz_check'
const PROVIDER = { plugin: 'comprehension-check', tier: 'user' } as never

// Stands for the engine beneath the mod: what it was asked to register and
// spawn, the toasts, and the notes left for Claude.
const engine = (on: On, { resolved = 'claude-haiku-5-5', spawnRefusal = '' } = {}) => {
  const seen = {
    registered: [] as Record<string, unknown>[],
    spawned: [] as AgentSpawnInput[],
    toasts: [] as string[],
    gate: [] as string[],
    quiz: 0,
  }
  on('agent.register', (_, e) => {
    seen.registered.push(e as unknown as Record<string, unknown>)
    return { value: { agent: `comprehension-check:${e.name}` } }
  })
  on('agent.spawn', (_, e) => {
    seen.spawned.push(e)
    if (spawnRefusal !== '') return { deny: spawnRefusal }
    return { model: e.model === 'haiku' ? resolved : (e.model ?? 'claude-opus-5-5'), agentId: 'writer-1' }
  })
  on('agent.offer', () => ({ isOffered: true }))
  on('tool.call', (_, e) => {
    if (e.tool === 'AskUserQuestion') {
      const qs = (e as { questions: { question: string; header: string }[] }).questions
      if (qs[0]?.header === 'Quiz time') {
        seen.gate.push(qs[0].question)
        return { result: { questions: qs, answers: { [qs[0].question]: 'Yes, quiz me' } } }
      }
      seen.quiz += 1
    }
    return { result: {} }
  })
  on('ui.toast', (_, e) => {
    seen.toasts.push(e.text)
    return { value: undefined }
  })
  on('model.complete', () => ({
    value: { isAnswered: true, text: 'auth check widened => QUIZ', usage: { input_tokens: 1, output_tokens: 1, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 } },
  }))
  on('process.run', () => ({
    value: { exitCode: 1, stdout: '', stderr: '', isStdoutTruncated: false, isStderrTruncated: false },
  }))
  on('classic.Stop', () => ({}))
  on('tool.register', (_, e) => ({ value: { tool: `mcp__comprehension-check__${e.name}` } }))
  on('command.register', () => ({ value: { command: 'quiz' } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  mock.store(on)
  const session = mock.session(on)
  const notes = () =>
    session
      .appended()
      .flatMap(row => row.message.content)
      .map(block => ('text' in block ? String(block.text) : ''))
  return { seen, notes }
}

// A spawn as the Agent tool makes it, the engine's own fields filled in.
const spawn = ($: Engine, args: Pick<AgentSpawnInput, 'subagentType' | 'prompt'> & Partial<AgentSpawnInput>) =>
  $.agent.spawn({
    tool_use_id: 'toolu_1',
    description: 'Write the quiz',
    provider: PROVIDER,
    parentModel: 'claude-opus-5-5',
    background: false,
    fork: false,
    ...args,
  })

const settings = ($: Engine, args: string) => $.command.run({ command: 'quiz', args: `settings ${args}`, ...RUN })
const spawnWriter = ($: Engine, prompt = 'Files: /repo/auth.ts. Decision: either flag now passes.') =>
  spawn($, { subagentType: WRITER_AGENT, prompt })
const offered = async ($: Engine) =>
  (await $.agent.offer({ agent: WRITER_AGENT, description: '', source: 'plugin', provider: PROVIDER })).isOffered

test('the writer is registered at session start: medium effort, read only, no CLAUDE.md', async ($, on) => {
  const { seen } = engine(on)
  await $.session.start(START)

  const spec = seen.registered.find(r => r.name === WRITER.name)
  expect(spec?.effort).toBe('medium')
  expect(spec?.model).toBe('inherit')
  expect(spec?.tools).toEqual(['Read', 'Grep', 'Glob', 'Bash'])
  expect(spec?.disallowedTools).toEqual(['Edit', 'Write', 'NotebookEdit'])
  expect(spec?.omitClaudeMd).toBe(true)
  expect(spec?.maxTurns).toBe(WRITER.maxTurns)
  expect(spec?.prompt).toBe(writerSystem())
})

test('on the session model, Claude is not offered the writer', async ($, on) => {
  engine(on)
  await $.session.start(START)
  expect(await offered($)).toBe(false)
  await settings($, 'model haiku')
  expect(await offered($)).toBe(true)
  await settings($, 'model session')
  expect(await offered($)).toBe(false)
})

test('the picked model runs the writer, with the settings added to the brief, and the user is told', async ($, on) => {
  const { seen } = engine(on)
  await $.session.start(START)
  await settings($, 'model haiku')
  await settings($, 'perspective architecture')
  await settings($, 'length size')
  await $.tool.call(EDIT)

  const started = await spawnWriter($)
  expect(started.model).toBe('claude-haiku-5-5')
  const spawned = seen.spawned[0]
  expect(spawned?.model).toBe('haiku')
  expect(spawned?.prompt).toStartWith('Files: /repo/auth.ts. Decision: either flag now passes.')
  expect(spawned?.prompt).toContain('Write exactly 1 question')
  expect(spawned?.prompt).toContain('Perspective: Architecture.')
  expect(seen.toasts).toContain('🧠 claude-haiku-5-5 is writing your quiz…')
})

test('a model Claude names for the writer gives way to the user pick', async ($, on) => {
  const { seen } = engine(on)
  await $.session.start(START)
  await settings($, 'model claude-sonnet-5-5')
  await spawn($, { subagentType: WRITER_AGENT, prompt: 'brief', model: 'opus' })
  expect(seen.spawned[0]?.model).toBe('claude-sonnet-5-5')
})

test('other agents start as they were asked', async ($, on) => {
  const { seen } = engine(on)
  await $.session.start(START)
  await settings($, 'model haiku')
  await spawn($, { subagentType: 'Explore', prompt: 'find the router', model: 'sonnet' })
  expect(seen.spawned[0]?.prompt).toBe('find the router')
  expect(seen.spawned[0]?.model).toBe('sonnet')
  expect(seen.toasts).toEqual([])
})

test('a refused spawn tells the user nothing; the instructions have Claude write the quiz', async ($, on) => {
  const { seen } = engine(on, { spawnRefusal: 'model not allowed' })
  await $.session.start(START)
  await settings($, 'model haiku')
  expect((await spawnWriter($)).deny).toBe('model not allowed')
  expect(seen.toasts).toEqual([])
})

test('every change, a model picked: the first edit hands off, and the quiz it brings is gated as before', async ($, on) => {
  const { seen, notes } = engine(on)
  await $.session.start(START)
  await settings($, 'trigger always')
  await settings($, 'model haiku')

  await $.tool.call(EDIT)
  expect(notes()[0]).toContain(`subagent_type "${WRITER_AGENT}"`)
  expect(notes()[0]).not.toContain('Perspective:')

  await spawnWriter($)
  await $.tool.call({
    tool: 'AskUserQuestion',
    metadata: { source: 'comprehension-check' },
    questions: [{ question: 'What does auth.ts let through now?', header: 'Edge case', multiSelect: false, options: [{ label: 'A', description: 'a' }, { label: 'B', description: 'b' }] }],
  } as never)
  expect(seen.gate.length).toBe(1)
  expect(seen.quiz).toBe(1)
  expect((await $.classic.Stop({ stop_hook_active: false })).block).toBeUndefined()
})

test('important changes, a model picked: the check tool hands off', async ($, on) => {
  engine(on)
  await $.session.start(START)
  await settings($, 'model haiku')
  await $.tool.call(EDIT)
  const reply = String((await $.tool.call({ tool: CHECK_TOOL } as never)).result)
  expect(reply).toContain('This change needs a quiz. It is worth a quiz: auth check widened.')
  expect(reply).toContain(`subagent_type "${WRITER_AGENT}"`)
})

test('/quiz status names the model writing the quizzes', async ($, on) => {
  engine(on)
  await $.session.start(START)
  const status = async () => (await $.command.run({ command: 'quiz', args: 'status', ...RUN })).text
  expect(await status()).not.toContain('written by')
  await settings($, 'model haiku')
  expect(await status()).toContain('Quizzes are written by haiku at medium effort.')
})
