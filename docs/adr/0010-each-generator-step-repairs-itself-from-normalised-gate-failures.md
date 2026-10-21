# Each generator step repairs only itself, from normalised gate failures

The repair loop runs inside each generator step and never crosses between them. The spec step repairs its UI spec against gate 1. The code step repairs its TSX against gates 2, 3 and 4 and the P0 taste rules, and it can't change the UI spec. A UI spec that passes gate 1 but can't be implemented means gate 1 has a gap. Sending the work back to the spec step would hide that gap, so the rep fails, the log names the gap and gate 1 gets fixed. One spec phase followed by one code phase also keeps a rep's attempts readable in an eval run ([ADR 0008](0008-eval-runs-are-a-budgeted-script-compared-after-the-fact.md)). Repair turns stay append-only ([ADR 0003](0003-generator-on-messages-api-not-an-agent-loop.md)), and each one carries a normalised list of failures, not raw tool output.

## Decisions that come with it

- **Attempt limits:** 3 for the spec step and 3 for the code step, so a rep makes at most 6 model calls. There's no separate per-rep cap. Limits and `max_tokens` (spec 32k, code 64k) live in the per-step config beside model and effort, so they're part of the version tuple.
- **Every gate that can run does run.** Gates 2 and 3 and the static taste rules always run on a code attempt. The render pass (gate 4 and the render-time taste rules) runs only if the screen builds; otherwise those gates are recorded as `not-run`. Every failure from one attempt goes into one repair turn.
- **Repair turn shape:** failures are grouped by gate, one line each as `gate · rule id · location · message`. The location is the node id for gate 1, `L<line>:<col>` in the model's own TSX for ESLint and tsc, and for render-time failures the CSS selector plus the element's outer HTML trimmed to about 200 characters. tsc message chains are flattened. Lines are deduplicated by (rule, location), and render failures are collapsed across theme × screen state into one line that lists where each one occurs. Each gate is capped at 20 lines with a `+N more` count. Each rule id gets one help line (ESLint's `meta.docs.description`, axe's `help`, the taste rule's line in `lint/taste/RULES.md`). The turn ends by asking for everything fixed and the whole output resent.
- **Whole outputs, never patches.** Every attempt returns a complete UI spec or a complete TSX file, so the gates always see a whole file and line numbers stay meaningful.
- **Only hard gates feed repair turns.** Pass criteria are the eval's answer key and are checked once, on the final UI spec. Soft gates (gate 5, once it exists) are measured, never fed back.
- **Non-gate failures end the rep as error** and never use a repair turn: a refusal, `stop_reason: max_tokens`, or API errors and timeouts after the SDK's own retries.
- **Logging:** `generate(screenBrief, { workDir })` returns a `RepTrace`, which the eval runner reads in-process.
  - **Per attempt:** step, attempt number, per-gate `pass | fail | not-run`, the failure lines as sent, `usage` (input, output, cache read, cache write), computed cost, `stop_reason`, request id, and wall time split into model call and gates.
  - **Per rep:** outcome and end reason (`passed`, `spec-attempts-exhausted`, `code-attempts-exhausted`, `error:<kind>`).
  - **Once per results file:** the registry and prompt hashes, in the version tuple, since neither can change within one invocation.
  - **Artifacts:** `workDir/attempt-<n>-<step>/` holds the UI spec or TSX, raw gate output, screenshots and the repair turn text. That's `evals/runs/<run-id>/…` in an eval run. The stand-alone CLI writes to a gitignored `.generated/<timestamp>-<slug>/` and prints each attempt's gate results as they happen.

## Considered options

- **Code-step failures send work back to the spec step**: it can rescue a rep, but it hides gate-1 gaps, needs an overall attempt cap, and makes reps hard to compare.
- **Stop at the first failing gate**: it spends an attempt finding each gate's failures one at a time.
- **Raw ESLint, tsc and axe output in the repair turn**: one contrast bug in a table cell repeats across every row and every theme × screen state render.
- **`data-node="<ui-spec id>"` on every generated node**, so render failures name UI spec ids: it's a new rule gate 2 would have to enforce, and a new attribute path through library components that take no `className` ([ADR 0002](0002-token-only-tailwind-and-eslint-token-lint.md)). Worth revisiting if evals show repairs that miss their target.
- **Feeding pass criteria back**: the model would be graded on what it was told to do.
