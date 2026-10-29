# Spec: the P0 vertical slice

What gets built first, in what order, and how each piece is known to be done. Every design decision lives in an ADR or the design brief; this spec points at them and never restates them. Where the two disagree, the ADR wins and this spec is stale. Decided in [Write the P0 vertical-slice spec](https://github.com/gianko/design-demo/issues/18).

## Scope

One screen brief goes end to end: the [design brief](design-brief.md) → tokens → eight library components, each built by a gated build-loop session → the generator turns `evals/briefs/payment-status.md` into a UI spec, then TSX, repairing itself against gates 1–4 and the five P0 taste rules → the passing screen is kept → tokens and the kept screen are pushed into Figma. CI gates every PR from the first component on.

The slice is P0 minus the eval runner, the other four screen briefs and the three components they need. [P0 widening](#p0-widening) builds those.

## The screen brief

`evals/briefs/payment-status.md`, `audience: contractor`. One overdue invoice, shown as a card the contractor checks: amount, status, due date, client, invoice number, and a **Send reminder** action.

Frontmatter pass criteria ([ADR 0008](adr/0008-eval-runs-are-a-budgeted-script-compared-after-the-fact.md)):

```yaml
audience: contractor
requires:
  components: [Screen, Card, StatusTag, Amount, Button]
  states: [empty, reminder-sent, reminder-failed]
  actions: [send-reminder]
```

| Screen state | Fixture | What shows |
|---|---|---|
| default | one overdue invoice | the card, the Button enabled |
| `empty` | no invoices | "No invoices yet" and what happens when one is sent |
| `reminder-sent` | reminder succeeded | the card, and a live Text: "Reminder sent to Northwind. We'll tell you when they pay." |
| `reminder-failed` | reminder failed | the card, a live Text saying what happened and what to do next, the Button still there |

Pending is not a screen state: it is the Button's own state while `send-reminder` runs ([ADR 0004](adr/0004-flat-library-only-ui-spec-and-zod-first-registry.md)).

## The smoke brief

A throwaway contractor brief that only Screen and Text can satisfy: literal copy, no bindings, states or actions. The thin path generates, keeps and captures it before the rest of the library exists. It lives with the test fixtures, not in `evals/briefs/`, so `pnpm eval` never runs it, and it stays afterwards as a manual smoke test of the generator. Its kept screen, baselines and Figma frames are removed once payment-status is kept.

## Build order

Tracer bullets, cut in [P0 vertical slice](https://github.com/gianko/design-demo/issues/23). A thin path goes first: tokens to a generated screen that is kept and captured in Figma, using only Screen and Text and [the smoke brief](#the-smoke-brief). The rest widens it until payment-status passes. The tickets are its sub-issues and hold the blocking edges; the sections below describe the pieces they are cut from, and a ticket may take only part of a piece.

1. **Thin path:** Scaffold the package with a CI job → Tokens reach a story → Gate a story in the pinned image → Raw values fail the gate; Registry core; Screen through the build loop; P0 taste rules; Build component: Text → Generate a toy screen → Render and keep a generated screen → Repair loop.
2. **Figma:** Sync tokens to Figma → Capture the kept screen in Figma.
3. **Widening:** Build-loop driver; Stack → Heading → Amount → StatusTag → Button → Card; payment-status data and gate 1's remaining checks → Actions change screen state through the library → payment-status passes end to end.

Three labels. `ready-for-agent` tickets are built with `/implement-spec` or `/implement`. `ready-for-human` tickets need the human: the required status check, the Figma login, the first hand-started session, and the finish line. `build-loop` tickets are components, each built by one headless `/build-component` session ([ADR 0006](adr/0006-one-gated-build-component-session-per-component.md)) and merged by PR with baselines the human approves ([ADR 0009](adr/0009-gates-render-in-one-pinned-linux-arm64-image.md)): Screen and Text are started by hand, Stack onwards by the build-loop driver. Only the driver or the human takes a `build-loop` ticket.

## Infrastructure pieces

### Scaffold

A single pnpm package: TypeScript strict, Vitest, ESLint flat config, Tailwind v4, Storybook (React + Vite) with `theme` (light/dark) and `density` (admin/contractor) globals whose decorator sets `data-theme` and `data-density` ([ADR 0002](adr/0002-token-only-tailwind-and-eslint-token-lint.md)), and the library barrel `src/index.ts`. `.env` gitignored for the API key ([ADR 0003](adr/0003-generator-on-messages-api-not-an-agent-loop.md)).

**Done when:** `pnpm typecheck`, `pnpm test` and `pnpm storybook:build` exit 0, and one placeholder story renders under all four globals combinations.

### Token build

The DTCG source files, `tokens/build.ts`, `tokens/keyframes.css` and the three committed outputs, exactly as [ADR 0005](adr/0005-dtcg-tokens-hand-built-into-css-ts-and-figma.md) and [ADR 0007](adr/0007-figma-sync-is-a-generated-one-call-script.md) shape them. Values come from the design brief, including the state roles, control pair, `0` step, `size` collection and progress sweep from [Decide the state and control tokens the build loop needs](https://github.com/gianko/design-demo/issues/20). The build validates: schema, matching paths and `$type` across modes, sRGB gamut, AA on every declared role pair in both themes, and the four checks from [`lint/taste/RULES.md`](../lint/taste/RULES.md#placed-elsewhere) (neutral chroma > 0, one `settle` overshoot of at most ~5%, neutral elevation, no banned font). It also fails two tokens that make the same class, an animation whose keyframes don't exist, and an overshoot on any easing but `settle`, and modes must declare the same contrast pairs so both themes are checked on the same pairs.

**Done when:**

- `pnpm tokens` writes `tokens.css`, `tokens.ts` and the Figma payload; a second run leaves `git status --porcelain` empty.
- A Vitest snapshot covers all three outputs.
- One failing fixture per validation makes the build exit non-zero with an error naming the token path and the check.
- The naming chain in ADR 0005 holds for one token per family, asserted in a test.

### Registry core

The pieces every `*.registry.ts` entry uses ([ADR 0004](adr/0004-flat-library-only-ui-spec-and-zod-first-registry.md)): a helper to define an entry (props schema, `use` line, slots with optional allow-lists; a slot named `body` is the component's `children`, and every other slot is a `ReactNode` prop named after it, such as Card's `header` and `footer`, which is how the code step renders a node in each, except a DataTable's row slots, `cell` and `detail`, each a function of the row), an `internal` flag for an entry only another component renders, such as Checkbox, which the spec step never sees, reading variant enums from a component's `tv()` config, serializing the registry for the spec step's system prefix, its content hash, and the wire schema's generated `component` enum.

**Done when:** Vitest, against two stub entries, shows that serialization is stable, the hash changes when and only when an entry changes, variants come from `tv()`, and the props type is `z.infer` of the entry.

### Token lint

Gate 2, all three ESLint layers of [ADR 0002](adr/0002-token-only-tailwind-and-eslint-token-lint.md), plus the rule that generated screens contain no intrinsic JSX elements ([ADR 0004](adr/0004-flat-library-only-ui-spec-and-zod-first-registry.md)), applied to `src/screens/` and generator output.

**Done when:** a planted-violation fixture, with one case per rule and one per colour namespace ([ADR 0005](adr/0005-dtcg-tokens-hand-built-into-css-ts-and-figma.md)), produces exactly the expected findings in a Vitest test, and a clean fixture produces none.

### Gate harness

`pnpm gate [<Component|screen>...] [--update]` as [ADR 0006](adr/0006-one-gated-build-component-session-per-component.md) and [ADR 0009](adr/0009-gates-render-in-one-pinned-linux-arm64-image.md) define it: ESLint and tsc, a Storybook build, then the Playwright pass inside the pinned arm64 image over every story × light/dark × admin/contractor: axe (gate 4), `toHaveScreenshot` with zero differing pixels against `gates/baselines/` (gate 6), a slot for render-time taste rules (gate 7), hover/pressed/focus shots and a contact sheet. With no argument it gates every component and kept screen; with several, the stories of each. A component that animates while idle also gets a mid-animation shot (ADR 0006, Consequences). Every render also holds to the harness rows of [`lint/taste/RULES.md` § Placed elsewhere](../lint/taste/RULES.md#placed-elsewhere): `script-error`, no `pageerror` or console error.

**Done when:** on the placeholder story, `pnpm gate` passes; a planted axe violation and a one-pixel change each fail with the story, theme and density named; a missing baseline fails under `--update-snapshots=none`; `--update` rewrites a baseline only when asked.

### P0 taste rules

`motion-tokens`, `no-pill`, `type-on-scale`, `tabular-numerals` and `text-overflow`, as specified in [`lint/taste/RULES.md`](../lint/taste/RULES.md), with exemptions in config only. Static parts run in ESLint; render parts run in the gate harness's gate 7 slot. Each rule's help line is its line in `RULES.md`.

**Done when:** each rule has a failing and a passing fixture (source file or story) and the gate reports the failing one with its rule id; the rule file credits impeccable where the table says so.

### CI gate job

The single job of [ADR 0009](adr/0009-gates-render-in-one-pinned-linux-arm64-image.md) on `ubuntu-24.04-arm`: frozen install, token build + a clean `git status --porcelain`, Vitest, `pnpm gate`. It is the required status check on main, and the Playwright report and contact sheet upload as artifacts. The repo goes public when this lands. The Pages deploy is not in the slice.

**Done when:** a PR that breaks a token output, a test or a baseline goes red, and a clean PR goes green.

### Build-loop driver

The build loop from `gianko/agent-quiz-app`, ported. It takes the first open, unblocked `build-loop` issue, runs one isolated headless session of `/build-component <Component>` (flags and allowlist as in [ADR 0006](adr/0006-one-gated-build-component-session-per-component.md)), and opens a PR that closes the issue, with the contact sheet linked. Each `GAPS.md` entry becomes a `needs-triage` issue that blocks the next `build-loop` issue. It stops when no `build-loop` issue is unblocked, and refuses to take one while a workflow's latest run on `main` failed. Session worktrees live under the main checkout's `.claude/worktrees`, and each run removes the clean ones whose branch has merged. The `/build-component` skill moves from the `prototype/build-component` branch to main, updated to run `pnpm gate` in the image.

**Done when:** `--dry-run` prints the issue it would take; one real run on the Screen issue ends in a PR whose CI is green.

### Fixtures and the screen brief

The typed fixtures module ([ADR 0004](adr/0004-flat-library-only-ui-spec-and-zod-first-registry.md)) for one contractor:

- Default: invoice `INV-0142`, client "Northwind Logistics & Freight Holdings Ltd." (long on purpose, for `text-overflow`), 4,800.00 USD, status overdue, `dueDate: "2026-10-08"` with `dueLabel: "Oct 8"`.
- Variants for `empty`, `reminder-sent` and `reminder-failed`.
- One mock operation, `sendReminder(invoiceId)`: it resolves after a fixed 1,800ms, long enough for the progress edge to fill and sweep once, and fails only when the active fixture variant says so.

Dates carry their display label beside the ISO value; the UI spec binds the label and keeps "Due " as literal copy. Also `evals/briefs/payment-status.md` as [above](#the-screen-brief).

**Done when:** the module typechecks, every variant is reachable by name, and a Vitest test shows `sendReminder` succeeding and failing deterministically by variant.

### Gate 1 and the spec step

The spec step: a streamed call whose output format is the flat wire schema, converted by `zodOutputFormat()` and validated by gate 1 against the same Zod schema, rather than `messages.parse()`, so a refusal, a `max_tokens` stop and a reply that doesn't parse each end as [ADR 0010](adr/0010-each-generator-step-repairs-itself-from-normalised-gate-failures.md) says instead of throwing ([ADR 0003](adr/0003-generator-on-messages-api-not-an-agent-loop.md)); the cached system prefix (design brief + serialized registry + wire schema, **no example UI specs**), with the bindable paths of `default` and the screen's own fixture variants in the user turn after it, which carries a cache breakpoint of its own (#275); and model, effort, `max_tokens` and attempt limit from the per-step config ([ADR 0003](adr/0003-generator-on-messages-api-not-an-agent-loop.md), [ADR 0010](adr/0010-each-generator-step-repairs-itself-from-normalised-gate-failures.md)). Gate 1 runs every check listed in [ADR 0004](adr/0004-flat-library-only-ui-spec-and-zod-first-registry.md), including the Screen root and `to` checks it gained here. The repair turns follow ADR 0010. The initial prompt is written here and hashed.

**Done when:** against a stub registry and the fixtures, Vitest shows that each gate 1 rule fails a planted UI spec with the node id and rule named, and a stubbed model that returns a failing UI spec, then a fixed one, produces one repair turn in the ADR 0010 shape and ends passed.

### Code step and repair

The code step: the UI spec and screen brief in, a whole TSX file out, written into the attempt's work dir and run through gates 2 and 3 and the static taste rules, then (if it builds) gate 4 and the render-time taste rules over light/dark × every declared state, at the audience's density ([ADR 0008](adr/0008-eval-runs-are-a-budgeted-script-compared-after-the-fact.md)). Repair, normalisation, error endings and the `RepTrace` are exactly [ADR 0010](adr/0010-each-generator-step-repairs-itself-from-normalised-gate-failures.md). `generate(screenBrief, { workDir })` is the entry point. The generator (both steps, `generate()`, and the `generate` and `keep` CLIs) lives in `generator/`, outside `src/`: it is tooling that calls the API, not library code.

**Done when:** Vitest with a stubbed model shows a failing TSX, then one repair turn (deduplicated, collapsed across theme × state, capped per gate), then a pass; a failing build records the render gates as `not-run`; a refusal and a `max_tokens` stop each end the rep as error with no repair turn; cost is computed from logged `usage`.

### Action wiring

The library's `ScreenHost`, its hooks `useScreenState`, `useAction` and `useFixtureData`, and the gate 2 rule `screen-state-via-library`, as [ADR 0011](adr/0011-motion-follows-declared-state-changes-owned-by-the-library.md) sets them out. The code step wires every declared action through them, and reads bound props and operation arguments from `useFixtureData`.

**Done when:** a test story wiring `sendReminder` through `useAction` enters `reminder-sent` through a `confirm` View Transition and `reminder-failed` through a `fail` one, and a planted generated screen that uses `useState` or calls `sendReminder` directly fails gate 2 with the rule id.

### Generate CLI

`pnpm generate <screen brief>`: one `generate()` run that prints each attempt's gate results as they happen, writes the attempt folders to `.generated/<timestamp>-<slug>/` ([ADR 0010](adr/0010-each-generator-step-repairs-itself-from-normalised-gate-failures.md)), and checks the screen brief's `requires.*` against the final UI spec. After the final attempt, gate 5 judges the final screen's light shot of each screen state and prints each state's verdicts, each failing one as `gate 5 · <state> · <criterion> · <reason>`, and the score, keeping them in the rep dir's `conformance.json` ([ADR 0014](adr/0014-brief-conformance-is-a-soft-vision-judge-proved-by-a-calibration-set.md)). It's soft: it changes neither the outcome nor the exit code, and a judge that fails shows as gate 5 not run.

**Done when:** run against the real library, it prints a per-attempt table and an outcome with its end reason, and exits 0 only on `passed` with pass criteria met.

### Keep

`pnpm keep <.generated rep dir>`: copies the final TSX to `src/screens/<slug>/` and writes one story per declared screen state plus the default, each with its fixture variant applied. The human then runs `pnpm gate <slug> --update` and approves the baselines on the PR ([ADR 0009](adr/0009-gates-render-in-one-pinned-linux-arm64-image.md)).

**Done when:** keeping a passed rep gives a screen whose `pnpm gate <slug>` passes after `--update`, with no hand edits.

### figma:sync-tokens

The generated one-call script and its thin driving skill, exactly as [ADR 0007](adr/0007-figma-sync-is-a-generated-one-call-script.md) shapes them, writing into [Dill Demo](https://www.figma.com/design/qgCHZ55XTiozWpZvASRzJE/Dill-Demo).

**Done when:** a sync reports created and updated counts and zero remaining changes; a tampered script throws on its checksum and writes nothing.

### Capture

The capture script in `.storybook/preview-head.html` and the prompt that runs `generate_figma_design` against Storybook's standalone iframe ([ADR 0007](adr/0007-figma-sync-is-a-generated-one-call-script.md)), with Color and Density modes set explicitly.

**Done when:** Dill Demo holds the kept payment-status screen in light and dark × its four states, and a read-only `boundVariables` walk reports colour, spacing, radius and type bound to variables.

[#59](https://github.com/gianko/design-demo/issues/59) built the capture against the kept smoke screen, which has no rounded corners, so radius went unchecked. The payment-status capture above, after the component pieces, is what checks it.

## Component pieces

One `build-loop` issue each, in this order, each blocked by the one before. Each is done when `pnpm gate <Component>` passes in CI, its `*.registry.ts` entry and stories exist, every variant and state is a story in light/dark × admin/contractor, it's exported from the barrel, and the human has approved its baselines and merged its PR. What follows is only what the slice needs from each. Anatomy and the rest are the session's component plan, against the design brief.

A component lives in `src/components/<Name>/`: the component, its `*.registry.ts` entry and its stories. Its root element carries `data-component="<Name>"`. Taste-rule exemptions name components, so both are how the gates find one: the file path in ESLint and the marker in the rendered page ([`lint/taste/config.ts`](../lint/taste/config.ts)).

1. **Screen**: the screen root. `audience` prop sets `data-density` and applies `p-page`. Exactly one per UI spec, as its root. It always renders one visually hidden, empty, polite `role="status"` region and provides `announce(text)` to the library through context, so the region exists before any copy arrives ([Text's `live`](https://github.com/gianko/design-demo/issues/98)).
2. **Stack**: direction, token-union gap and alignment, no `className` ([ADR 0002](adr/0002-token-only-tailwind-and-eslint-token-lint.md)).
3. **Text**: `tone` and `size` ([ADR 0004](adr/0004-flat-library-only-ui-spec-and-zod-first-registry.md)), and a `live` prop, which confirms an action's result: a live Text renders as an ordinary paragraph and, each time its state is entered (re-entered by a retry included), calls Screen's `announce` with its copy, which Screen adds to the region as a new node, so repeated copy is announced again. P1's Toast reuses `announce` rather than being its own live region ([ADR 0011](adr/0011-motion-follows-declared-state-changes-owned-by-the-library.md)).
4. **Heading**: `level` 1–3.
5. **Amount**: `value`, `currency`, `display: table|card`; it owns tabular figures, cents and currency format.
6. **StatusTag**: the five status pairs, each with its word; tag radius, never a pill.
7. **Button**: primary, secondary and quiet intents; rest, hover, pressed, focus-visible, disabled and pending; the progress edge and its sweep; pending and disabled semantics as the design brief states them.
8. **Card**: a flat surface with a `line` hairline and the density's surface radius, with named slots for its header, body and footer.

## Slice done

The slice is done when all of these hold:

1. CI is green on main with all eight components and the kept payment-status screen, every story baselined in light/dark × admin/contractor.
2. `pnpm generate evals/briefs/payment-status.md` ends `passed` with its pass criteria met in **3 of 3** separate runs.
3. The stubbed Vitest tests show fail → repair turn → pass for each generator step.
4. A `figma:sync-tokens` apply reports zero remaining changes.
5. Dill Demo holds the bound captures from **Capture**.
6. The smoke brief's kept screen, baselines and Figma frames are gone; the smoke brief remains.

A natural first-attempt failure for the Loom is collected from whichever real run produces one. It isn't a criterion.

## Out of scope

Everything in the [map's Out of scope](https://github.com/gianko/design-demo/issues/1), plus, for the slice: Toast, DataTable (it joins [after the slice](#library-widening)) and every other component in demo brief §4 not listed above; gate 5; the signature transitions (P1, [ADR 0011](adr/0011-motion-follows-declared-state-changes-owned-by-the-library.md)); component frames in Figma (P2); example UI specs in prompts.

## P0 widening

The rest of P0, built on the finished slice: the eval runner and its report ([ADR 0008](adr/0008-eval-runs-are-a-budgeted-script-compared-after-the-fact.md)), the other four screen briefs and their fixtures ([Eval screen briefs](#eval-screen-briefs)), PageHeader, Checkbox and DataTable ([Library widening](#library-widening)), and the GitHub Pages deploy ([ADR 0009](adr/0009-gates-render-in-one-pinned-linux-arm64-image.md)). Every decision behind these is already made; this section adds only the order and how each piece is known to be done.

### Widening build order

Tracer bullets, cut in [P0 widening](https://github.com/gianko/design-demo/issues/161), with the same three labels as the [slice's build order](#build-order). The tickets hold the blocking edges.

1. **Data:** Fixtures for the P0 five → The four new screen briefs.
2. **Evals:** Eval runner → Eval report → Pages deploy.
3. **Library:** PageHeader → Checkbox → DataTable, as `build-loop` issues the driver takes, each blocked by the one before.
4. **Finish line** (`ready-for-human`): the first full eval run, blocked by all of the above.

### Fixtures for the P0 five

The fixtures module widened to the one shared dataset that [Fixtures](#fixtures) describes: each new brief's `<brief>/<state>` variants, and `payInvoices(invoiceIds)` beside `sendReminder`, settling the same way. payment-status's variants keep their names and the data its kept screen binds.

**Done when:** the module typechecks; a Vitest test shows `payInvoices` succeeding and failing deterministically by variant; and `pnpm gate payment-status` passes with no baseline rewritten.

### The four new screen briefs

`payment-overview`, `invoice-queue`, `invoice-review` and `payment-run` in `evals/briefs/`, each as its row of [The P0 five](#the-p0-five) asks and following [Rules every brief follows](#rules-every-brief-follows), with its pass criteria in the frontmatter.

**Done when:** a Vitest test over every file in `evals/briefs/`, payment-status included, shows that each one parses as a screen brief, that every id its `requires.*` keys list appears verbatim in its body, and that every fixture variant its screen-state table names exists.

### Eval runner

`pnpm eval`, exactly as [ADR 0008](adr/0008-eval-runs-are-a-budgeted-script-compared-after-the-fact.md) shapes it, calling the slice's `generate()` in-process. CI only typechecks it and runs its unit tests against a stubbed `generate()` ([ADR 0009](adr/0009-gates-render-in-one-pinned-linux-arm64-image.md)).

After a rep's last attempt, gate 5 judges its final screen as `pnpm generate` does ([ADR 0014](adr/0014-brief-conformance-is-a-soft-vision-judge-proved-by-a-calibration-set.md)); a rep that ended in error or was skipped isn't judged. The results file keeps each rep's `gate5`: each state's verdicts and reasons, or why it wasn't judged, and the score. Its totals give a pass rate per criterion per screen brief, where a judged rep passes a criterion when every screen state does, and the judge's model, effort and prompt hash join the version tuple. The judge's calls count toward the rep's cost, the run's totals and the budget. The estimate takes them in through the latest results file's median rep cost, and adds a nominal judge call per screen state while that file is from before gate 5, counting the light renders each screen brief's final code attempt had there, open sheets and ticked rows included. Gate 5 is soft: a rep's outcome and the run's pass rates are computed without it.

**Done when:** Vitest, with a stubbed `generate()` whose usage is priced the way real usage is, shows:

- each rep ends as pass, fail, error or skipped as ADR 0008 defines them, with the pass criteria checked once, on the final UI spec;
- first-attempt and final pass rates per screen brief, with errors and skips left out;
- at the budget, no new rep starts and the in-flight ones finish, and `--budget none` never skips;
- the estimate comes from the latest results file's median rep cost, and the runner asks to confirm only when the estimate is over budget;
- a dirty tree is refused without `--allow-dirty` and recorded with it;
- the results file holds the version tuple, `--briefs`, `--k` and the per-rep and per-attempt fields ADR 0008 lists, and each rep's scratch lands in its own `evals/runs/<run-id>/` folder.

### Eval report

`pnpm eval:report <a.json> [b.json]`, as [ADR 0008](adr/0008-eval-runs-are-a-budgeted-script-compared-after-the-fact.md) shapes it. Beside each summary table, a gate 5 table gives per screen brief and overall the reps judged, each criterion's pass rate, the score and the judge's cost, reading `2/3 → 3/3` in a comparison. A run without gate 5, such as every results file before it, reads not run, never zero. Each rep lists its failing verdicts with their reasons, or why gate 5 didn't run. The summary's cost takes in the judge's calls and says how much of it is gate 5's, so a run from before gate 5 compares fairly.

**Done when:** from hand-written results files, a Vitest test shows that one file gives a run report and two give a comparison, as a single HTML file styled by `tokens.css` that references nothing outside itself; that counts read `2/3 → 3/3` per screen brief and overall, beside mean attempts, cost, wall time and per-gate failure counts; that a comparison flags runs whose brief sets differ; and that screenshots are embedded when the run's scratch folder exists and left out when it doesn't.

### Pages deploy

The second CI job of [ADR 0009](adr/0009-gates-render-in-one-pinned-linux-arm64-image.md): on a push to main, once the gate job passes, it publishes `storybook-static` at the Pages root and the newest committed results file's report at `/evals/`, without screenshots. A run given `pnpm eval --baseline <results file>` names that file in its own, and `/evals/` then serves the comparison against it: the screen briefs both runs cover side by side, the rest on their own. Turning Pages on, with GitHub Actions as its source, is the human's job.

**Done when:** a push to main publishes Storybook at the Pages URL; `/evals/` serves the newest results file's report once one is committed, and Storybook still deploys while there isn't one; and a red gate job publishes nothing.

### PageHeader, Checkbox and DataTable

Each is done as a [component piece](#component-pieces) is. What P0 needs from each is in [Library widening](#library-widening), plus the following from the ADRs:

- **PageHeader**'s `actions` slot allow-list is Button alone, until a public IconButton exists ([ADR 0004](adr/0004-flat-library-only-ui-spec-and-zod-first-registry.md)).
- **DataTable** takes its rows through a bound prop, and each column's `cell` slot holds one template node whose `row.*` bindings render once per row ([ADR 0004](adr/0004-flat-library-only-ui-spec-and-zod-first-registry.md)).
- **DataTable** owns ticking rows, and the `ScreenHost` holds the selection. An action's success clears the selection and its failure keeps it, and a generated screen reads the ticked ids with `useSelectedRows()` ([ADR 0011](adr/0011-motion-follows-declared-state-changes-owned-by-the-library.md)). Since [ADR 0013](adr/0013-bulk-actions-live-in-datatables-footer-results-are-toasts.md) the selection is no screen state: ticking enters none, and the action on it sits in the table's `actions` footer.
- **DataTable**'s money cells end-align (`tabular-numerals`). Its `detail` slot and the Sheet wait for P1.

### The first full eval run

The human runs `pnpm eval` with the API key: all five briefs, K = 3, on a clean tree, raising `--budget` if the estimate asks for it. They commit the results file. A brief that passes 0 of 3 points at a gap in the library or in gate 1; the gap gets an issue and a fix, then the run is repeated.

### P0 done

P0 is done when all of these hold:

1. CI is green on main with all eleven components and the kept payment-status screen, every story baselined in light/dark × admin/contractor.
2. The five screen briefs are in `evals/briefs/` and pass the test in [The four new screen briefs](#the-four-new-screen-briefs).
3. The full eval run's results file is committed. No rep in it ended in error or was skipped, and every brief, invoice-queue included, passed at least 1 of 3.
4. The Pages site serves Storybook, and `/evals/` serves that run's report.

payment-status stays the only kept screen. The new briefs are judged by evals alone, not by gate 6 or a Figma capture.

## After P1

[P1](https://github.com/gianko/design-demo/issues/201) takes what P0 deferred: the signature transitions with DataTable's actions footer, Toast and Sheet ([ADR 0011](adr/0011-motion-follows-declared-state-changes-owned-by-the-library.md), [ADR 0013](adr/0013-bulk-actions-live-in-datatables-footer-results-are-toasts.md)), the shared Phosphor icon map with an internal IconButton, the remaining eleven taste rules ([`lint/taste/RULES.md`](../lint/taste/RULES.md)) and the full brief set. What P1 defers in turn, each with its reason:

- **Forms (Input, Select):** the UI spec has no field values, validation or submission. Adding them needs a new concept and an ADR.
- **Row-scoped actions,** such as a Button inside a Sheet acting on that row: a new kind of action, and another ADR.
- **A public IconButton:** no brief has an honest use for one. It stays an internal entry that Sheet renders as its close button.
- **Tabs, Pagination, Grid and sortable DataTable:** no brief needs them.
- **A Date component:** with no sorting, dates stay plain copy, pre-formatted labels bound from the fixtures.

## Eval screen briefs

Decided in [Choose the eval screen briefs and their pass criteria](https://github.com/gianko/design-demo/issues/21).

### The P0 five

Three admin, two contractor. Each is `evals/briefs/<slug>.md`.

| Slug | Audience | What it asks for |
|---|---|---|
| `payment-status` | contractor | As [above](#the-screen-brief), unchanged. |
| `payment-overview` | contractor | Three Cards, each bound to a named fixture path: **next payment** (scheduled, amount, "Arrives Oct 24"), **last payment** (paid), **paid this year** (a total). Read-only. |
| `invoice-queue` | admin | About 8 invoices across 5 contractors in a DataTable. An **Approve and pay** Button sits in the DataTable's `actions` footer, disabled until a row is ticked (moved there from the PageHeader by [ADR 0013](adr/0013-bulk-actions-live-in-datatables-footer-results-are-toasts.md)). Success moves the selected rows to scheduled, with a live Text: "3 invoices scheduled for the Oct 24 run." Failure leaves them as they were, with a live Text saying what happened and what to do next. The stretch brief: a first-attempt failure is likely, and its pass bar is the same as the others'. |
| `invoice-review` | admin | One awaiting invoice in a Card under a PageHeader: amount, contractor, invoice number, due date, line count. **Approve and pay** is the only action, with the same action id and states as `invoice-queue`. The same shape as payment-status at admin density. |
| `payment-run` | admin | The next payment run: the run date in the PageHeader, then Cards with `display: card` Amounts, a StatusTag and a count each for **due in this run** (scheduled), **overdue** and **awaiting approval**. Read-only. |

Pass criteria:

| Slug | `requires.components` | `requires.states` | `requires.actions` |
|---|---|---|---|
| `payment-status` | Screen, Card, StatusTag, Amount, Button | empty, reminder-sent, reminder-failed | send-reminder |
| `payment-overview` | Screen, Heading, Card, Amount, StatusTag | empty | — |
| `invoice-queue` | Screen, PageHeader, DataTable, StatusTag, Amount, Button | empty, payment-scheduled, payment-failed | approve-and-pay |
| `invoice-review` | Screen, PageHeader, Card, Amount, StatusTag, Button | payment-scheduled, payment-failed | approve-and-pay |
| `payment-run` | Screen, PageHeader, Card, Amount, StatusTag | empty | — |

Checkbox is never listed: DataTable renders it for selection, so the UI spec never names it.

### Rules every brief follows

- **Shape.** A short plain-language paragraph plus a screen-state table naming each state's id and fixture variant, as payment-status does. Every id a `requires.*` key checks appears verbatim in the brief.
- **Pass criteria are presence only.** The listed components, states and actions must appear in the final UI spec; extras are allowed, and count, order and placement aren't checked. Layout quality is left to gate 4, taste lint and, later, gate 5.
- **No repeats outside DataTable.** The flat UI spec repeats a node only in a DataTable's `cell` slot ([ADR 0004](adr/0004-flat-library-only-ui-spec-and-zod-first-registry.md)), so a brief never asks for a list drawn any other way; a fixed set of named cards is fine.
- **Not in P0:** form screens (Input, Select, Checkbox as a field) and the `loading` state, which joins once a component can show it. Pending stays the Button's own state.

### Fixtures

One dataset serves both audiences: 5 contractors and about 8 invoices, with INV-0142 for Northwind unchanged. The contractor briefs view one contractor ("you") inside it. Each brief's state variants are named `<brief>/<state>`, e.g. `invoice-queue/payment-failed`. The mock operations are `sendReminder(invoiceId)` and a shared `payInvoices(invoiceIds)`, both resolving after the fixed 1,800ms and failing only when the active variant says so. Every date is a pre-formatted label beside its ISO value, so no Date component is needed.

### Library widening

The P0 set adds three components, built in this order after Card, each blocked by the one before:

1. **PageHeader**: title and an `actions` slot that allows only Button (there's no public IconButton, see [After P1](#after-p1)).
2. **Checkbox**: the row selector DataTable renders.
3. **DataTable**: selectable rows only, with a `cell` slot per column. No sorting, filters or pagination in P0.

Toast, EmptyState, IconButton and the rest of demo brief §4 wait for P1. Empty states use Heading and Text, and a live Text confirms an action's result.

### The P1 set

15–20 briefs, written as build work after the P0 widening, under one coverage rule: every library component appears in at least 2 briefs, each audience gets at least a third of them, and every action has a failure state.

The ten new briefs and what each asks for are in [P1](https://github.com/gianko/design-demo/issues/201). Pass criteria, with `requires.transitions` from [ADR 0011](adr/0011-motion-follows-declared-state-changes-owned-by-the-library.md) as [ADR 0013](adr/0013-bulk-actions-live-in-datatables-footer-results-are-toasts.md) amends them:

| Slug | `requires.components` | `requires.states` | `requires.actions` | `requires.transitions` |
|---|---|---|---|---|
| `bulk-pay` | Screen, PageHeader, DataTable, StatusTag, Amount, Button, Toast, EmptyState | empty, payment-scheduled, payment-failed | pay-selected | table-action-to-toast |
| `overdue-invoices` | Screen, PageHeader, DataTable, StatusTag, Amount, Sheet, Heading, Button, Toast, EmptyState | empty, reminders-sent, reminders-failed | send-reminders | table-action-to-toast, row-to-sheet |
| `failed-payments` | Screen, PageHeader, DataTable, StatusTag, Amount, Button, Toast, EmptyState | empty, payments-retried, retry-failed | retry-payments | table-action-to-toast |
| `contractors` | Screen, PageHeader, DataTable, Amount, Sheet, EmptyState | empty | — | row-to-sheet |
| `run-history` | Screen, PageHeader, DataTable, StatusTag, Amount, Sheet, EmptyState | empty | — | row-to-sheet |
| `my-invoices` | Screen, Heading, DataTable, Sheet, Amount, StatusTag, Text, EmptyState | empty | — | row-to-sheet |
| `payments-received` | Screen, Heading, DataTable, Amount, Sheet, EmptyState | empty | — | row-to-sheet |
| `payment-failed` | Screen, Heading, Card, Amount, StatusTag, Button, Toast | retry-requested, retry-failed | request-retry | — |
| `withdraw-invoice` | Screen, Heading, Card, Amount, StatusTag, Text, Button, Toast | invoice-withdrawn, withdraw-failed | withdraw-invoice | — |
| `annual-summary` | Screen, Heading, Card, Amount, DataTable, EmptyState | empty | — | — |

Text is the thinnest-covered component: my-invoices and withdraw-invoice each ask for a Text per detail line and list it, which makes the two briefs the coverage rule needs. The brief-set test checks the rule across the set.
