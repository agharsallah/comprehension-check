---
type: llm
weight: 2
---
Look only at the `questions` array of the JSON object in the reply; ignore `answer_key`.

A wrong option should be a mistake a reasonable reader could make, so its description gives the
reason someone would pick it. It must not say why it is wrong.

For each option, read its description as the user would. Does it undercut its own label: does it
say the label does not happen, cannot be, is not how the code works, or give the reason it fails?
Examples of descriptions that undercut their label:
- "Throws an error" with "No check runs on the text, so no error is raised."
- "429 is retried" with "A 4xx, a client error, so the code throws at once." (in a question that
  asks which calls are retried)
- "A code lookup" with "A lookup would reject unknown codes; this change has none."

PASS if no option's description undercuts its own label.
FAIL if any option's description undercuts its label, or if there is no JSON object with `questions`.
