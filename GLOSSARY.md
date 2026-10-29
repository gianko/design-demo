# Design Demo

A pipeline where a human-written design brief defines taste, an AI-built design system encodes it, and an agent generates product screens that quality gates hold to that standard.

## Taste and system

**Design brief**:
The one-page, human-written statement of taste (tone, density, type, colour logic, motion, references, banned defaults) that the design system is built against.
_Avoid_: Brief (unqualified), style guide, spec

**Design system**:
The tokens, component library and Storybook built by Claude Code against the design brief.
_Avoid_: UI kit, theme

**Token**:
A named design value (colour, spacing, radius, type, elevation, motion, z-index) that is the only legal source of that value in code and Figma.
_Avoid_: Variable (except when naming the Figma object), constant

**Theme**:
The light or dark set of colour values; every colour role has a value in each. Independent of the density set.
_Avoid_: Mode (except when naming the Figma object), colour scheme

**Build loop**:
The unattended Claude Code loop that builds the design system, one issue per iteration.
_Avoid_: Ralph, agent loop

**Density set**:
The row heights, container padding and target sizes for one audience: working density for the admin, full room for the contractor.
_Avoid_: Compact mode, size variant

**Component frame**:
The Figma component set for one library component, its main variants made from the component's own code and bound to the file's variables; a surface a designer opens and comments on, never an input to the code.
_Avoid_: Figma component, master component, design component

## People

**Admin**:
The finance or ops person who reviews, approves and pays contractor invoices, often many a day; the primary user of generated screens.
_Avoid_: Operator, customer, user (unqualified)

**Contractor**:
The person who submits invoices and gets paid, a few times a month; the secondary user of generated screens.
_Avoid_: Freelancer, vendor, payee, user (unqualified)

## Generation

**Generator**:
The two-step workflow that turns a screen brief into a UI spec, then the UI spec into a generated screen; a fixed sequence of model calls, not an agent.
_Avoid_: Agent (for this), pipeline (unqualified)

**Screen brief**:
A plain-language request for one product screen for one audience (admin or contractor), e.g. "invoice list with filters, overdue state, bulk-pay action".
_Avoid_: Prompt, brief (unqualified), task

**UI spec**:
The typed JSON description of a screen, produced from a screen brief before any code exists, referencing only registered components.
_Avoid_: Spec (unqualified), schema, layout JSON

**Registry**:
The machine-readable list of library components, their props, slots and usage, that a UI spec is validated against; each component's props are defined by its registry entry, and a UI spec may give any of them except the code-only ones, and name any component but an internal entry.
_Avoid_: Catalog, manifest

**Internal entry**:
A registry entry for a component only another component renders, e.g. Checkbox, which DataTable renders; the spec step never sees it and gate 1 rejects a UI spec node naming it, while the code step sees it marked internal.
_Avoid_: Private component, hidden component

**Code-only prop**:
A registry prop that a UI spec never gives and the code step sets, e.g. Button's `pending`, which the code step takes from the running action.
_Avoid_: Hidden prop, internal prop, runtime prop

**Fixtures**:
The one fixed, typed set of sample contractors, invoices and payments that every generated screen renders, including the variants its screen states use.
_Avoid_: Mock data, seed data, sample data

**Fixture variant**:
One named version of the fixtures that a screen state renders. `default` is shared by every screen; every other variant belongs to one screen and is named for it and its state, e.g. `bulk-pay/payment-failed`.
_Avoid_: Fixture state, scenario

**Screen state**:
A named condition of one generated screen (empty, loading, error, payment scheduled) that the UI spec declares and each eval run renders; distinct from an invoice's status, which comes from the data, and from the selection, which is the table's own.
_Avoid_: View, mode, variant

**Selection**:
The rows of a screen's table that the user has ticked, which an action in the table's actions footer, such as approve and pay, acts on. It belongs to the table, not to a screen state; a confirmed action clears it, and a failed one keeps it.
_Avoid_: Checked rows, picked items, rows selected (as a screen state)

**Actions footer**:
The strip along the bottom of a table's frame, below its rows, that holds the table's bulk actions and its selected count. It is always there on a table that has actions, its buttons unavailable until a row is ticked.
_Avoid_: ActionBar, bulk-action bar, toolbar

**Selected count**:
The words at the start of the actions footer saying how many rows are ticked, written by the UI spec in three forms (none, one, more) with the number filled in by the library.
_Avoid_: Selection label, counter

**Signature transition**:
One of the design brief's two named transitions, the pay confirmation (pending → stagger → toast) and row → sheet. A generated screen shows one by including the components and screen states that carry it, never by describing the motion.
_Avoid_: Animation, effect, hero motion

**Generated screen**:
The React/TSX code produced from a UI spec.
_Avoid_: Output, page

**Kept screen**:
A generated screen committed to the repo with a story per screen state, held to the same gates as a library component from then on.
_Avoid_: Promoted screen, reference screen, saved screen

**Open-sheet render**:
A screen story of the default state with the first row's Sheet open, one for each DataTable with a `detail` slot, gated, baselined and captured like a screen state. It isn't a screen state: the open sheet is DataTable's own state, set from the start through a library test attribute, `data-test-open-detail`, which only this story sets (from its `openSheet` parameter).
_Avoid_: Sheet state, detail-open state

**Rows-ticked render**:
A screen story of the default state with every row of a table ticked, one for each DataTable with `actions`, gated, baselined and captured like a screen state. It isn't a screen state: the selection is the table's own, set from the start through a library test attribute, `data-test-tick-rows`, which only this story (from its `tickRows` parameter) and an action clicked in a table's footer set.
_Avoid_: Rows-selected state, selection state

## Quality

**Gate**:
A single pass/fail check applied to a UI spec, a generated screen, or the design system itself.
_Avoid_: Check, validator, test (when meaning a gate)

**Token lint**:
The gate that rejects any styling value not drawn from a token.
_Avoid_: Style lint, design lint

**Taste lint**:
The gate that holds code and rendered output to the design brief's taste beyond what tokens can enforce; made of taste rules.
_Avoid_: Slop detector, design lint

**Taste rule**:
One named, deterministic check in the taste lint, run on source code or on a rendered story or screen.
_Avoid_: Detector, heuristic

**Brief conformance**:
The gate that judges how a generated screen looks against the design brief, one pass/fail criterion at a time, each with a reason; it reports without failing a rep until its verdicts are shown to be trusted.
_Avoid_: Vision gate, AI judge, design review

**Calibration set**:
Copies of kept screens, each broken by hand against one brief-conformance criterion, judged beside the kept screens as they are to show whether brief conformance's verdicts are right and repeatable.
_Avoid_: Golden set, test set

**Baseline**:
The approved screenshot of one story in one theme and density that visual regression compares against; only the human changes one.
_Avoid_: Snapshot, golden

**Style expectation**:
A story's own check of a computed style in one or more of its renders, stated as a value, unlike a taste rule, which holds every story to the same check.
_Avoid_: Assertion, style test, contract

**Repair loop**:
Feeding a generator step's hard-gate failures back to that same step, with the original screen brief, for another attempt; a step never sends work back to an earlier one.
_Avoid_: Retry, fix loop

**Repair turn**:
The message appended after a failing attempt that lists its hard-gate failures and asks for the whole output again, corrected.
_Avoid_: Retry prompt, feedback message

**Eval run**:
One execution of the fixed set of screen briefs, K times each, recording per-gate results, attempts, cost and time.
_Avoid_: Benchmark, test run

**Rep**:
One generator run of one screen brief inside an eval run, ending as pass, fail, error (infrastructure broke) or skipped (the budget ran out first).
_Avoid_: Trial, iteration, run (unqualified)

**Attempt**:
One model call of a generator step together with the gate results on what it produced; a repair turn starts the next attempt.
_Avoid_: Try, retry

**Pass criteria**:
A screen brief's own requirements (components, screen states, actions) that the final UI spec of a rep must meet, on top of the gates.
_Avoid_: Acceptance criteria, assertions

**`table-action-to-toast`**:
The pass criterion for the pay confirmation: a table's actions footer holds a Button that runs an action, whose success state shows a success toast and whose failure state a failure toast.
_Avoid_: bar-to-toast

**Coverage rule**:
What the set of screen briefs must meet as a whole: every library component appears in at least two briefs' pass criteria, each audience gets at least a third of the briefs, and every action has a failure state. Internal entries and layout primitives aren't counted.
_Avoid_: Coverage (unqualified), brief quota
