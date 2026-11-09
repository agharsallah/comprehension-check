---
description: End to end, live prompt. A docs-only change under the default setting (quiz on important changes) gets the check tool called, the triage model says no quiz, and none is asked.
tags: [e2e, triage, skip]
runs: 3
max_turns: 15
timeout_seconds: 300
allowed_tools: [Read, Glob, Grep, Write, Edit]
append_system_prompt: "This is a non-interactive evaluation run. AskUserQuestion does not exist here and no one can answer it; do not search for it. Whenever you would call AskUserQuestion, end your turn instead with its exact input (the object with questions and metadata) as a single ```json code block, and write nothing after the block."
---

Create `docs/STYLE.md` with exactly this content, and nothing else:

```markdown
# Writing style

Write the way you would explain the code to a teammate at your desk.

- Use short sentences, one idea each.
- Prefer everyday words to jargon; when a term is needed, say what it means the first time.
- Name things by what they do, not by how they are built.
- Put the most important point first.
```
