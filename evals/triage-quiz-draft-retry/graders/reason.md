---
type: llm
---
The reply is a triage verdict on a code change, of the form `<reason> => QUIZ`. The reason is shown to the developer.

PASS if the reason names what this change is really about: the conflict handling: retrying on a 412 / conflict, the field-by-field merge, or that one tab's edit can be lost.
FAIL if the reason is generic ("code changed", "small change", "worth checking"), names something the change does not do, or there is no reason.
