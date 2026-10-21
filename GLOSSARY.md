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

**Screen brief**:
A plain-language request for one product screen, e.g. "invoice list with filters, overdue state, bulk-pay action".
_Avoid_: Prompt, brief (unqualified), task

**UI spec**:
The typed JSON description of a screen, produced from a screen brief before any code exists, referencing only registered components.
_Avoid_: Spec (unqualified), schema, layout JSON

**Registry**:
The machine-readable list of library components and their props that a UI spec is validated against.
_Avoid_: Catalog, manifest

**Generated screen**:
The React/TSX code produced from a UI spec.
_Avoid_: Output, page

## Quality

**Gate**:
A single pass/fail check applied to a UI spec, a generated screen, or the design system itself.
_Avoid_: Check, validator, test (when meaning a gate)

**Repair loop**:
Feeding gate failures back to the agent, with the original screen brief, for another attempt.
_Avoid_: Retry, fix loop

**Eval run**:
One execution of the fixed set of screen briefs, K times each, recording per-gate results, attempts, cost and time.
_Avoid_: Benchmark, test run
