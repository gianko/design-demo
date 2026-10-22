# Spec: the P0 vertical slice

What gets built first, in what order, and how each piece is known to be done. Every design decision lives in an ADR or the design brief; this spec points at them and never restates them. Where the two disagree, the ADR wins and this spec is stale. Decided in [Write the P0 vertical-slice spec](https://github.com/gianko/design-demo/issues/18).

## Scope

One screen brief goes end to end: the [design brief](design-brief.md) → tokens → eight library components, each built by a gated build-loop session → the generator turns `evals/briefs/payment-status.md` into a UI spec, then TSX, repairing itself against gates 1–4 and the five P0 taste rules → the passing screen is kept → tokens and the kept screen are pushed into Figma. CI gates every PR from the first component on.

The slice is P0 minus the eval runner and the other four screen briefs (see [After the slice](#after-the-slice)).

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

## Build order

Two tracks. **Infrastructure** pieces are tickets labelled `ready-for-agent`, built with `/implement-spec`. **Component** pieces are tickets labelled `build-loop`, each built by one headless `/build-component` session the build-loop driver starts ([ADR 0006](adr/0006-one-gated-build-component-session-per-component.md)), merged by PR with baselines the human approves ([ADR 0009](adr/0009-gates-render-in-one-pinned-linux-arm64-image.md)).

```
Scaffold
├─ Token build ──────────┬─ Token lint ───────┐
│                        ├─ Gate harness ─────┼─ P0 taste rules ─ CI gate job ─ Build-loop driver ─ Components (8, in order)
│                        └─ figma:sync-tokens │                                                          │
├─ Registry core ────────────────────────────────────────────────────────────────────────────────────────┤
└─ Fixtures + screen brief ─ Gate 1 + spec step ─ Code step + repair ─ Generate CLI ─ Keep ─ Capture ─ Slice done
                                                  (also needs Token lint, Gate harness, P0 taste rules;  (needs all
                                                   built against stubs, so it runs beside the components)  components)
```

The generator track is built and tested against a stub registry and a stubbed model, so it doesn't wait for the components. Only **Keep** onwards needs all eight merged.

## Infrastructure pieces

### Scaffold

A single pnpm package: TypeScript strict, Vitest, ESLint flat config, Tailwind v4, Storybook (React + Vite) with `theme` (light/dark) and `density` (admin/contractor) globals whose decorator sets `data-theme` and `data-density` ([ADR 0002](adr/0002-token-only-tailwind-and-eslint-token-lint.md)), and the library barrel `src/index.ts`. `.env` gitignored for the API key ([ADR 0003](adr/0003-generator-on-messages-api-not-an-agent-loop.md)).

**Done when:** `pnpm typecheck`, `pnpm test` and `pnpm storybook:build` exit 0, and one placeholder story renders under all four globals combinations.

### Token build

The DTCG source files, `tokens/build.ts`, `tokens/keyframes.css` and the three committed outputs, exactly as [ADR 0005](adr/0005-dtcg-tokens-hand-built-into-css-ts-and-figma.md) and [ADR 0007](adr/0007-figma-sync-is-a-generated-one-call-script.md) shape them. Values come from the design brief, including the state roles, control pair, `0` step, `size` collection and progress sweep from [Decide the state and control tokens the build loop needs](https://github.com/gianko/design-demo/issues/20). The build validates: schema, matching paths and `$type` across modes, sRGB gamut, AA on every declared role pair in both themes, and the four checks from [`lint/taste/RULES.md`](../lint/taste/RULES.md#placed-elsewhere) (neutral chroma > 0, one `settle` overshoot of at most ~5%, neutral elevation, no banned font).

**Done when:**
- `pnpm tokens` writes `tokens.css`, `tokens.ts` and the Figma payload; a second run leaves `git diff --exit-code` clean.
- A Vitest snapshot covers all three outputs.
- One failing fixture per validation makes the build exit non-zero with an error naming the token path and the check.
- The naming chain in ADR 0005 holds for one token per family, asserted in a test.

### Registry core

The pieces every `*.registry.ts` entry uses ([ADR 0004](adr/0004-flat-library-only-ui-spec-and-zod-first-registry.md)): a helper to define an entry (props schema, `use` line, slots with optional allow-lists), reading variant enums from a component's `tv()` config, serializing the registry for the spec step's system prefix, its content hash, and the wire schema's generated `component` enum.

**Done when:** Vitest, against two stub entries, shows that serialization is stable, the hash changes when and only when an entry changes, variants come from `tv()`, and the props type is `z.infer` of the entry.

### Token lint

Gate 2, all three ESLint layers of [ADR 0002](adr/0002-token-only-tailwind-and-eslint-token-lint.md), plus the rule that generated screens contain no intrinsic JSX elements ([ADR 0004](adr/0004-flat-library-only-ui-spec-and-zod-first-registry.md)), applied to `src/screens/` and generator output.

**Done when:** a planted-violation fixture, with one case per rule and one per colour namespace ([ADR 0005](adr/0005-dtcg-tokens-hand-built-into-css-ts-and-figma.md)), produces exactly the expected findings in a Vitest test, and a clean fixture produces none.

### Gate harness

`pnpm gate [<Component|screen>] [--update]` as [ADR 0006](adr/0006-one-gated-build-component-session-per-component.md) and [ADR 0009](adr/0009-gates-render-in-one-pinned-linux-arm64-image.md) define it: ESLint and tsc, a Storybook build, then the Playwright pass inside the pinned arm64 image over every story × light/dark × admin/contractor: axe (gate 4), `toHaveScreenshot` with zero differing pixels against `gates/baselines/` (gate 6), a slot for render-time taste rules (gate 7), hover/pressed/focus shots and a contact sheet. With no argument it gates every component and kept screen. A component that animates while idle also gets a mid-animation shot (ADR 0006, Consequences).

**Done when:** on the placeholder story, `pnpm gate` passes; a planted axe violation and a one-pixel change each fail with the story, theme and density named; a missing baseline fails under `--update-snapshots=none`; `--update` rewrites a baseline only when asked.

### P0 taste rules

`motion-tokens`, `no-pill`, `type-on-scale`, `tabular-numerals` and `text-overflow`, as specified in [`lint/taste/RULES.md`](../lint/taste/RULES.md), with exemptions in config only. Static parts run in ESLint; render parts run in the gate harness's gate 7 slot. Each rule's help line is its line in `RULES.md`.

**Done when:** each rule has a failing and a passing fixture (source file or story) and the gate reports the failing one with its rule id; the rule file credits impeccable where the table says so.

### CI gate job

The single job of [ADR 0009](adr/0009-gates-render-in-one-pinned-linux-arm64-image.md) on `ubuntu-24.04-arm`: frozen install, token build + `git diff --exit-code`, Vitest, `pnpm gate`. It is the required status check on main, and the Playwright report and contact sheet upload as artifacts. The repo goes public when this lands. The Pages deploy is not in the slice.

**Done when:** a PR that breaks a token output, a test or a baseline goes red, and a clean PR goes green.

### Build-loop driver

The build loop from `gianko/agent-quiz-app`, ported. It takes the first open, unblocked `build-loop` issue, runs one isolated headless session of `/build-component <Component>` (flags and allowlist as in [ADR 0006](adr/0006-one-gated-build-component-session-per-component.md)), and opens a PR that closes the issue, with the contact sheet linked. Each `GAPS.md` entry becomes a `needs-triage` issue that blocks the next `build-loop` issue. It stops when no `build-loop` issue is unblocked. The `/build-component` skill moves from the `prototype/build-component` branch to main, updated to run `pnpm gate` in the image.

**Done when:** `--dry-run` prints the issue it would take; one real run on the Screen issue ends in a PR whose CI is green.

### Fixtures and the screen brief

The typed fixtures module ([ADR 0004](adr/0004-flat-library-only-ui-spec-and-zod-first-registry.md)) for one contractor:
- Default: invoice `INV-0142`, client "Northwind Logistics & Freight Holdings Ltd." (long on purpose, for `text-overflow`), 4,800.00 USD, status overdue, `dueDate: "2026-10-08"` with `dueLabel: "Oct 8"`.
- Variants for `empty`, `reminder-sent` and `reminder-failed`.
- One mock operation, `sendReminder(invoiceId)`: it resolves after a fixed 1,800ms, long enough for the progress edge to fill and sweep once, and fails only when the active fixture variant says so.

Dates carry their display label beside the ISO value; the UI spec binds the label and keeps "Due " as literal copy. Also `evals/briefs/payment-status.md` as [above](#the-screen-brief).

**Done when:** the module typechecks, every variant is reachable by name, and a Vitest test shows `sendReminder` succeeding and failing deterministically by variant.

### Gate 1 and the spec step

The spec step: `messages.parse()` with the flat wire schema, the cached system prefix (design brief + serialized registry + wire schema, **no example UI specs**), and model, effort, `max_tokens` and attempt limit from the per-step config ([ADR 0003](adr/0003-generator-on-messages-api-not-an-agent-loop.md), [ADR 0010](adr/0010-each-generator-step-repairs-itself-from-normalised-gate-failures.md)). Gate 1 runs every check listed in [ADR 0004](adr/0004-flat-library-only-ui-spec-and-zod-first-registry.md), including the Screen root and `to` checks it gained here. The repair turns follow ADR 0010. The initial prompt is written here and hashed.

**Done when:** against a stub registry and the fixtures, Vitest shows that each gate 1 rule fails a planted UI spec with the node id and rule named, and a stubbed model that returns a failing UI spec, then a fixed one, produces one repair turn in the ADR 0010 shape and ends passed.

### Code step and repair

The code step: the UI spec and screen brief in, a whole TSX file out, written into the attempt's work dir and run through gates 2 and 3 and the static taste rules, then (if it builds) gate 4 and the render-time taste rules over light/dark × every declared state, at the audience's density ([ADR 0008](adr/0008-eval-runs-are-a-budgeted-script-compared-after-the-fact.md)). Repair, normalisation, error endings and the `RepTrace` are exactly [ADR 0010](adr/0010-each-generator-step-repairs-itself-from-normalised-gate-failures.md). `generate(screenBrief, { workDir })` is the entry point.

**Done when:** Vitest with a stubbed model shows a failing TSX, then one repair turn (deduplicated, collapsed across theme × state, capped per gate), then a pass; a failing build records the render gates as `not-run`; a refusal and a `max_tokens` stop each end the rep as error with no repair turn; cost is computed from logged `usage`.

### Generate CLI

`pnpm generate <screen brief>`: one `generate()` run that prints each attempt's gate results as they happen, writes the attempt folders to `.generated/<timestamp>-<slug>/` ([ADR 0010](adr/0010-each-generator-step-repairs-itself-from-normalised-gate-failures.md)), and checks the screen brief's `requires.*` against the final UI spec.

**Done when:** run against the real library, it prints a per-attempt table and an outcome with its end reason, and exits 0 only on `passed` with pass criteria met.

### Keep

`pnpm keep <.generated run dir>`: copies the final TSX to `src/screens/<slug>/` and writes one story per declared screen state plus the default, each with its fixture variant applied. The human then runs `pnpm gate <slug> --update` and approves the baselines on the PR ([ADR 0009](adr/0009-gates-render-in-one-pinned-linux-arm64-image.md)).

**Done when:** keeping a passed run gives a screen whose `pnpm gate <slug>` passes after `--update`, with no hand edits.

### figma:sync-tokens

The generated one-call script and its thin driving skill, exactly as [ADR 0007](adr/0007-figma-sync-is-a-generated-one-call-script.md) shapes them, writing into [Dill Demo](https://www.figma.com/design/qgCHZ55XTiozWpZvASRzJE/Dill-Demo).

**Done when:** a sync reports created and updated counts; an immediate dry-run reports zero changes; a tampered script throws on its checksum and writes nothing.

### Capture

The capture script in `.storybook/preview-head.html` and the prompt that runs `generate_figma_design` against Storybook's standalone iframe ([ADR 0007](adr/0007-figma-sync-is-a-generated-one-call-script.md)), with Color and Density modes set explicitly.

**Done when:** Dill Demo holds the kept payment-status screen in light and dark × its four states, and a read-only `boundVariables` walk reports colour, spacing, radius and type bound to variables.

## Component pieces

One `build-loop` issue each, in this order, each blocked by the one before. Each is done when `pnpm gate <Component>` passes in CI, its `*.registry.ts` entry and stories exist, every variant and state is a story in light/dark × admin/contractor, it's exported from the barrel, and the human has approved its baselines and merged its PR. What follows is only what the slice needs from each. Anatomy and the rest are the session's component plan, against the design brief.

1. **Screen**: the screen root. `audience` prop sets `data-density` and applies `p-page`. Exactly one per UI spec, as its root.
2. **Stack**: direction, token-union gap and alignment, no `className` ([ADR 0002](adr/0002-token-only-tailwind-and-eslint-token-lint.md)).
3. **Text**: `tone` and `size` ([ADR 0004](adr/0004-flat-library-only-ui-spec-and-zod-first-registry.md)), and a `live` prop that renders it as a polite `role="status"` region, which confirms an action's result.
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
4. `figma:sync-tokens` dry-run reports zero changes after a sync.
5. Dill Demo holds the bound captures from **Capture**.

A natural first-attempt failure for the Loom is collected from whichever real run produces one. It isn't a criterion.

## Out of scope

Everything in the [map's Out of scope](https://github.com/gianko/design-demo/issues/1), plus, for the slice: Toast, DataTable (it joins [after the slice](#library-widening)) and every other component in demo brief §4 not listed above; gate 5; the signature transitions (P1, [ADR 0011](adr/0011-motion-follows-declared-state-changes-owned-by-the-library.md)); component frames in Figma (P2); example UI specs in prompts.

## After the slice

The widening, each already decided:

- `pnpm eval` and `pnpm eval:report`, and the other four P0 screen briefs ([ADR 0008](adr/0008-eval-runs-are-a-budgeted-script-compared-after-the-fact.md)), as [Eval screen briefs](#eval-screen-briefs) sets them out. The payment-status brief joins unchanged.
- Three more `build-loop` issues, after Card, each blocked by the one before: **PageHeader**, **Checkbox**, **DataTable** ([below](#library-widening)).
- The GitHub Pages deploy of Storybook and the newest eval report ([ADR 0009](adr/0009-gates-render-in-one-pinned-linux-arm64-image.md)).
- The shared Phosphor icon map, with the first component that needs an icon, probably IconButton.
- A Date component, once a screen brief needs relative dates or sorting by date.
- The remaining eleven taste rules ([`lint/taste/RULES.md`](../lint/taste/RULES.md)).
- The signature transitions, ActionBar, Toast and Sheet, and the `bulk-pay` brief, as [ADR 0011](adr/0011-motion-follows-declared-state-changes-owned-by-the-library.md) sets them out.

## Eval screen briefs

Decided in [Choose the eval screen briefs and their pass criteria](https://github.com/gianko/design-demo/issues/21).

### The P0 five

Three admin, two contractor. Each is `evals/briefs/<slug>.md`.

| Slug | Audience | What it asks for |
|---|---|---|
| `payment-status` | contractor | As [above](#the-screen-brief), unchanged. |
| `payment-overview` | contractor | Three Cards, each bound to a named fixture path: **next payment** (scheduled, amount, "Arrives Oct 24"), **last payment** (paid), **paid this year** (a total). Read-only. |
| `invoice-queue` | admin | About 8 invoices across 5 contractors in a selectable DataTable. An **Approve and pay** Button sits in the PageHeader's `actions` slot, shown only `when: [rows-selected]`. Success moves the selected rows to scheduled, with a live Text: "3 invoices scheduled for the Oct 24 run." Failure leaves them as they were, with a live Text saying what happened and what to do next. The stretch brief: a first-attempt failure is likely, and its pass bar is the same as the others'. |
| `invoice-review` | admin | One awaiting invoice in a Card under a PageHeader: amount, contractor, invoice number, due date, line count. **Approve and pay** is the only action, with the same action id and states as `invoice-queue`. The same shape as payment-status at admin density. |
| `payment-run` | admin | The next payment run: the run date in the PageHeader, then Cards with `display: card` Amounts, a StatusTag and a count each for **due in this run** (scheduled), **overdue** and **awaiting approval**. Read-only. |

Pass criteria:

| Slug | `requires.components` | `requires.states` | `requires.actions` |
|---|---|---|---|
| `payment-status` | Screen, Card, StatusTag, Amount, Button | empty, reminder-sent, reminder-failed | send-reminder |
| `payment-overview` | Screen, Heading, Card, Amount, StatusTag | empty | — |
| `invoice-queue` | Screen, PageHeader, DataTable, StatusTag, Amount, Button | empty, rows-selected, payment-scheduled, payment-failed | approve-and-pay |
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

1. **PageHeader**: title and an `actions` slot that allows only Button (IconButton isn't in the library yet).
2. **Checkbox**: the row selector DataTable renders.
3. **DataTable**: selectable rows only, with a `cell` slot per column. No sorting, filters or pagination in P0.

Toast, EmptyState, IconButton and the rest of demo brief §4 wait for P1. Empty states use Heading and Text, and a live Text confirms an action's result.

### The P1 set

15–20 briefs, written as build work after the P0 widening, under one coverage rule: every library component appears in at least 2 briefs, each audience gets at least a third of them, and every action has a failure state.
