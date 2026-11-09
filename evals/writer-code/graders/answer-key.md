---
type: llm
weight: 2
---
The reply is a JSON object with `questions` (a quiz on a 5-minute in-memory price cache added to
`getPrice` in `src/pricing.ts`) and `answer_key`.

Check the answer key:
1. Is there exactly one `answer_key` entry per question, in the same order, each with the same
   `header` as its question?
2. Does each entry's `correct` name an option of its question, or for a checkbox question the
   right set of its options? A question may leave its options incomplete on purpose, so the user
   explains in their own words under "Other"; its `correct` is then the answer to write, and that
   is fine.
3. Is each `correct` answer actually right for the code in the diff? Trace it: for example a read
   at exactly 5 minutes misses (`now - hit.at < TTL_MS` is false), each instance has its own Map,
   and nothing clears an entry when a price changes.
4. Does each `why` tie the answer to the code in one or two sentences?

PASS if all four hold for every question. FAIL if any entry is missing, mismatched, names no
option, is wrong for the code, or if there is no JSON object with `questions` and `answer_key`.
