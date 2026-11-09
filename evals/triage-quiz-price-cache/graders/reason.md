---
type: llm
---
The reply is a triage verdict on a code change, of the form `<reason> => QUIZ`. The reason is shown to the developer.

PASS if the reason names what this change is really about: caching prices: a cached price can be stale for up to 5 minutes, the TTL, or the cache in getPrice.
FAIL if the reason is generic ("code changed", "small change", "worth checking"), names something the change does not do, or there is no reason.
