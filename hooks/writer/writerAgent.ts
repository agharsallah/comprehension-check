// The quiz-writer subagent, for a user who picked a model to write their
// quizzes (Settings.quizModel). The quiz instructions tell Claude to start
// it with the Agent tool (prompts/quiz/delegated.ts); as it starts, the mod
// sets its model to the user's pick and adds the user's quiz settings to
// Claude's brief, so the model and the settings are the mod's to enforce,
// not Claude's to remember. It thinks at WRITER.effort and only reads.
//
// With quizzes written on the session's model (the default), the agent is
// kept out of Claude's agent listing.

import type { EngineInterface, On } from 'claude-code'

import { PLUGIN_NAME, WRITER, WRITER_AGENT } from '../config'
import type { ChangeTracker } from '../changes/changeTracker'
import { usesQuizWriter } from '../prompts/quiz/instructions'
import { WRITER_DESCRIPTION, writerSystem, writerTask } from '../prompts/writer/writerAgent'
import { questionCountFor } from '../quiz/questionCount'
import type { QuizRequest } from '../quiz/quizRequest'
import { readSettings } from '../settings/settings'

export type WriterAgentDeps = { changes: ChangeTracker; request: QuizRequest }

export async function defineWriterAgent($: EngineInterface) {
  try {
    await $.agent.register({
      name: WRITER.name,
      description: WRITER_DESCRIPTION,
      prompt: writerSystem(),
      tools: WRITER.tools,
      disallowedTools: WRITER.disallowedTools,
      // Until a spawn sets the user's pick.
      model: 'inherit',
      effort: WRITER.effort,
      maxTurns: WRITER.maxTurns,
      omitClaudeMd: true,
    })
  } catch (error) {
    // Claude then writes the quiz itself: the Agent call fails, and the
    // instructions say what to do then.
    $.ui.log(`${PLUGIN_NAME}: the quiz writer agent did not register: ${String(error)}`, { to: 'debug' })
  }
}

export function registerWriterAgent(on: On, { changes, request }: WriterAgentDeps) {
  on('agent.offer', { agent: WRITER_AGENT }, async ($, e, next) =>
    usesQuizWriter(await readSettings($)) ? next(e) : { isOffered: false },
  )

  on('agent.spawn', async ($, e, next) => {
    if (e.subagentType !== WRITER_AGENT) return next(e)
    const settings = await readSettings($)
    // The quiz is about what the user asked for, else what is owed a quiz.
    const count = questionCountFor(settings, request.requested ?? changes.owed)
    const prompt = writerTask(e.prompt, count, settings)
    const started = await next(usesQuizWriter(settings) ? { ...e, prompt, model: settings.quizModel } : { ...e, prompt })
    // What the subagent really runs on, as the engine resolved it.
    if (started.deny === undefined) $.ui.toast(`🧠 ${started.model} is writing your quiz…`)
    return started
  })
}
