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
The machine-readable list of library components, their props, slots and usage, that a UI spec is validated against; each component's props are defined by its registry entry.
_Avoid_: Catalog, manifest

**Fixtures**:
The one fixed, typed set of sample contractors, invoices and payments that every generated screen renders, including the variants its screen states use.
_Avoid_: Mock data, seed data, sample data

**Screen state**:
A named condition of one generated screen (empty, loading, error, rows selected) that the UI spec declares and each eval run renders; distinct from an invoice's status, which comes from the data.
_Avoid_: View, mode, variant

**Generated screen**:
The React/TSX code produced from a UI spec.
_Avoid_: Output, page

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

**Repair loop**:
Feeding gate failures back to the generator, with the original screen brief, for another attempt.
_Avoid_: Retry, fix loop

**Eval run**:
One execution of the fixed set of screen briefs, K times each, recording per-gate results, attempts, cost and time.
_Avoid_: Benchmark, test run
