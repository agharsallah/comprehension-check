---
type: llm
---
The reply is a triage verdict on a code change, of the form `<reason> => SKIP`. The reason is shown to the developer.

PASS if the reason names what this change is really about: a variable rename with the logic unchanged.
FAIL if the reason is generic ("code changed", "small change", "worth checking"), names something the change does not do, or there is no reason.
