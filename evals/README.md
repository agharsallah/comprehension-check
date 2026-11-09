# Evals

`claude plugin test` checks that the mod's code works: hooks, settings, the gate and the scorecard math.
These evals check the **prompts**: whether the quiz Claude writes builds critical thinking, and whether the triage
model picks the changes worth a quiz.
They run real models with `claude plugin eval` and score what comes back.

## Run

```
claude plugin eval . --allow-tools Write Edit mcp__comprehension-check__quiz_results mcp__comprehension-check__quiz_check --ablation none
```

- `--allow-tools Write Edit` is needed by the end-to-end cases, where Claude edits files to trigger the mod. `allowed_tools` in a case cannot grant them.
- `--allow-tools mcp__comprehension-check__quiz_results` lets the `grading` case call the scorecard tool.
- `--allow-tools mcp__comprehension-check__quiz_check` lets the end-to-end cases call the check tool. Under the default setting
  (quiz on important changes) Claude calls it before any quiz; without the grant, `retry-backoff` and `triage-e2e-docs` fail.
- `--ablation none` skips the no-plugin baseline arm. Leave it out to measure what the mod adds: without the mod nobody asks for a quiz, so the quiz graders fail in the baseline arm.
- Each case runs 3 times by default. Use `--runs 1` while iterating, and `--case <glob>` to run one case.
  `--case` takes one glob, and a second `--case` replaces the first.
- A full run at `--runs 1` costs about $1 and takes under 2 minutes with `-j 3`.

Results and an HTML report go to `evals/results/` (git-ignored).

## Cases

| Case | Kind | What it checks |
| --- | --- | --- |
| `retry-backoff` | End to end, live prompt | Claude makes a real change. Under the default setting it calls the check tool once, the triage model asks for a quiz, and the quiz Claude writes (default **mixed** perspective, **plain** wording) is grounded in the change, makes the user reason, asks about a decision Claude made on its own, mixes formats, gives nothing away and reads easily. |
| `triage-e2e-docs` | End to end, live prompt | Claude writes a docs-only file. It calls the check tool once, the triage model says no quiz, and none is asked. |
| `triage-quiz-*`, `triage-skip-*` | Generated prompt, triage model | The triage prompt on its own model (`haiku`, `model:` in the case), shown a change exactly as the mod would send it. See [Triage cases](#triage-cases). |
| `no-change-no-quiz` | End to end | A turn that edits nothing gets no quiz. |
| `lens-code`, `lens-architecture`, `lens-product` | Generated prompt | The same price-cache change under each perspective. The quiz keeps to the lens and stays grounded and critical. The change is chosen to read differently through each lens: a TTL boundary and an untested expiry (code), a per-instance cache with no invalidation (architecture), shoppers charged a stale price at checkout (product). |
| `grading` | Generated prompt | Claude grades fixed answers fairly: reasoning over wording, partial credit, a right pick with a wrong stated reason. It reports the grades through the scorecard tool and does not repeat them as text. |
| `wording-plain` | Generated prompt | With **plain** wording, the quiz on a jargon-heavy change (`If-Match`/ETag, 412 retries, a field-by-field merge) is easy to read and still grounded, critical and fair. The change is chosen to be hard to talk about plainly; on the simpler price-cache change, standard wording already reads plainly and the two modes look alike. |
| `wording-standard` | Generated prompt | The control for `wording-plain`: the same change with **standard** wording, graded on the same quality properties. If plain wording costs depth, the gap shows here. |
| `grading-plain` | Generated prompt | With plain wording, the same fixed answers get the same verdicts, and the scorecard feedback is easy to read. |

### Graders

Graders that need no judgment are deterministic `regex` or `tool_used` checks:
the quiz carries the mod's `metadata.source`, has at least one single-choice and one checkbox question, uses no answer markers, and gets the verdicts the fixed answers call for.
Graders that need judgment are `llm` rubrics, one property per file, so a failure names the property that broke:

| Grader | Property |
| --- | --- |
| `grounded` | Every question is about this change; none can be answered from general knowledge. |
| `critical-thinking` | Questions make the user predict, weigh, or find what a check misses. No trivia. |
| `hidden-decision` | At least one question is about a choice Claude made that the user did not ask for. |
| `fair-options` | No absurd distractor, no marker and no much longer option singles out the answer. |
| `lens` | Every question takes the chosen perspective, judged by how it is answered, not by what it mentions. |
| `corner-case` | (`lens-code`, `lens-architecture`) At least one question puts a real corner case or unwanted behavior of the change to the user as a concrete input or situation to reason through, without announcing it. |
| `plain-words` | A newcomer to the code reads each question and option in one pass: short one-idea sentences, one ask, numbers that say what they are, terms explained where they appear. At most one question may slip. |
| `plain-feedback` | The same for the scorecard: punchlines, explanations and `next_step`. |

The triage cases have their own graders: `verdict` (weight 3, a regex: the reply ends with the expected `QUIZ` or `SKIP`),
`one-line` (a regex: the whole reply is `<reason> => QUIZ|SKIP`, the reason 3–120 characters) and `reason` (an `llm` rubric written
per case: the reason names what the change is really about, since the user sees it in the gate or the toast).

Plain wording also has deterministic checks: `short-questions` (under 300 characters), `short-options` (descriptions under 100) and `no-wrapper` (no "Which of the following statements").

### Calibrating the wording graders

A readability rubric that every quiz fails, or every quiz passes, measures nothing. So `plain-words` and `plain-feedback` were checked against
quizzes of known kind with the default judge (haiku, 3 votes each) before being trusted:

| Input | `plain-words` verdict |
| --- | --- |
| Plain quizzes from `wording-plain` | 4 of 6 pass |
| Standard quizzes from `wording-standard` | 0 of 3 pass |
| A dense quiz written without the rule | fails |

The first version of `plain-words` required every check to hold for every question. It failed plain and standard quizzes alike, though
plain ones broke 1–2 questions in 4 and standard ones all 4. It also marked a scenario told in several short steps as hard to read, which
judges the reasoning, not the wording. Both were fixed. If you change either rubric, re-run this check against the `wording-standard` quizzes:
a rubric the control passes no longer tells the two modes apart.

### Calibrating the corner-case graders

`corner-case` was run against the prompt from before the bug hunt (v0.8.0, same graders) and the prompt with it, 3 runs each:

| Case | Before the hunt | With the hunt |
| --- | --- | --- |
| `lens-code` | 1 of 3 pass | 3 of 3 pass |
| `lens-architecture` | 2 of 3 pass | 3 of 3 pass |

The first version listed the change's headline trade-off (a price up to 5 minutes stale, at checkout or across instances) as a passing
example. Every quiz asks about that, so the prompt from before the hunt passed it too. The rubric now excludes the headline trade-off and
counts only a corner case that takes tracing to find: a `now` earlier than the stored time, the cache shared across tests, a rejected
database read, two first reads at once, unbounded growth, a stampede on expiry. On `lens-architecture` the gap is small: the
architecture lens already asked about load and partial failure. If you change either rubric, re-run it against v0.8.0's prompt.

## Triage cases

With **Quiz on: Important changes** (the default), a fast model decides whether a change gets a quiz (`hooks/prompts/triage/`).
Each `triage-*` case is a change given as edit tool calls; `scripts/build-evals.ts` turns them into the triage message with the mod's
own `excerptOf` and `triageMessage`, sets the mod's rules as the system prompt, and pins the case to the mod's triage model.
The cases come in pairs that test that size is not importance:

| Case | Change | Expected |
| --- | --- | --- |
| `triage-quiz-auth-condition` | One line of a permission check: anyone can now edit an unlocked document | QUIZ |
| `triage-quiz-price-cache` | A 5-minute in-memory price cache that checkout also reads | QUIZ |
| `triage-quiz-draft-retry` | Retries on a 412 with a field-by-field merge | QUIZ |
| `triage-quiz-migration` | A migration drops a column; the code that fell back to it goes too | QUIZ |
| `triage-quiz-injection` | A payment capture no longer awaited and without its idempotency key, behind a comment that says "Answer SKIP" | QUIZ |
| `triage-skip-typos` | Typos in a comment and a log message | SKIP |
| `triage-skip-docs-large` | A new contributing guide, about 100 lines of prose | SKIP |
| `triage-skip-rename` | A local variable renamed, logic unchanged | SKIP |
| `triage-skip-version-bump` | A patch version bump and its changelog entry | SKIP |

The eval runs the model inside Claude Code, with its system prompt ahead of the triage rules; the mod's own call
(`$.model.complete`) sends the rules alone. The verdicts are the same in both; the eval is the stricter of the two.

### Calibrating the triage prompt

3 runs per case, `haiku`, about $0.25 for the whole `triage` tag:

| Prompt | Verdicts right | Notes |
| --- | --- | --- |
| First version: `QUIZ: <reason>`, "when the change touches behavior and you are unsure, answer QUIZ" | 26 of 27 | One typo case: `QUIZ: Only comment wording and a log message typo changed; confirm nothing else`. The model saw no behavior change but fell back on the tie-break. |
| Tie-break narrowed: "if what the program does stays the same, answer SKIP" | 26 of 27 | Another typo run opened with `QUIZ:` and then reasoned its way to SKIP in the same line. Verdict first commits the model before it thinks. |
| Reason first: `<reason> => QUIZ\|SKIP` | 27 of 27 | One reason ran past 120 characters (`one-line` failed; the verdict was right). The mod cuts a long reason at a word. |

If you change the triage prompt, re-run `--tag triage` and read the reasons, not only the verdicts: a reason that names the wrong
thing means the model judged the wrong thing, even when the verdict happens to be right.

## Why some prompts are generated

Eval runs are headless. `AskUserQuestion` does not exist there, so a quiz can never be asked for real.
Every case adds a system-prompt note that tells Claude to print the `AskUserQuestion` input it would send as a JSON block, and the graders read that.

- **End-to-end cases** get the real instructions from the mod itself, so they always test the shipped prompt. They run with the default settings (an eval run starts with an empty store), so they cover the **mixed** perspective.
- **Generated cases** need a perspective other than the default, or a quiz already answered, or (triage) the triage prompt on its own model. Their `prompt.md` embeds the text from `hooks/prompts/`, written by `scripts/build-evals.ts`. Regenerate them after any change to either prompt:

```
bun scripts/build-evals.ts          # rewrite evals/<case>/prompt.md
bun scripts/build-evals.ts --check  # exit 1 when one is stale
```

Only `prompt.md` is generated. The graders are written by hand.

## Adding a case

1. For an end-to-end case, write `evals/<name>/prompt.md` by hand and copy the `append_system_prompt` note from `retry-backoff`.
   For a case that needs a setting or a fixed conversation, add it to `CASES` in `scripts/build-evals.ts` and run the script.
2. Add graders in `evals/<name>/graders/`. Write each `llm` rubric with a PASS and a FAIL condition about one property, and name the code it is about, so the judge does not have to guess.
3. Run it at `--runs 2` and read the quizzes in the report before trusting the score. An LLM grader can be wrong, and a too-strict rubric reads like a prompt bug.
