# Money inside a Text string

A sentence such as "Your $4,800.00 payment arrives Oct 24" can't be one Text. Text sets no tabular figures and holds no inline Amount.

## Why this is out of scope

Money is bound data, and Amount owns how it looks: tabular figures, cents and currency format. In a UI spec, copy is a literal string and data is a `{ "bind": ... }` ([ADR 0004](../docs/adr/0004-flat-library-only-ui-spec-and-zod-first-registry.md)), so a real amount can't sit inside a literal Text string anyway. Text's `use` line sends money to Amount. When a generated Text does hold an amount, the `tabular-numerals` render rule (gate 7) fails it, and the repair splits it out.

The two alternatives each cost more than they fix:

- Text always setting tabular figures would make prose with money pass, but every date and count in prose would get tabular digits too.
- Text taking inline Amount children would need a slot that holds runs of text and nodes, which the flat UI spec doesn't have.

## When to reconsider

If eval runs show the gate 7 repair costing turns.

## Prior requests

- #99: "Text gap: Money inside a sentence has nowhere to go"
