---
type: llm
---
The reply is a triage verdict on a code change, of the form `<reason> => QUIZ`. The reason is shown to the developer.

PASS if the reason names what this change is really about: dropping the legacy_email column (data loss), removing the fallback to it, or what now happens to users with no email.
FAIL if the reason is generic ("code changed", "small change", "worth checking"), names something the change does not do, or there is no reason.
