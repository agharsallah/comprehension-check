---
type: llm
---
The reply is a triage verdict on a code change, of the form `<reason> => QUIZ`. The reason is shown to the developer.

PASS if the reason names what this change is really about: the permission check in canEdit now lets more people edit (anyone, or any non-owner, can edit an unlocked document), or at least that the auth/edit-permission condition changed.
FAIL if the reason is generic ("code changed", "small change", "worth checking"), names something the change does not do, or there is no reason.
