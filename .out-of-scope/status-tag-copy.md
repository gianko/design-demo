# Status tag copy

StatusTag shows one fixed word per status, the brief's own: Awaiting, Overdue, Paid, Scheduled, Failed. A screen passes only `status`. There is no `label` prop, no longer wording such as "Awaiting approval", and no wording per audience.

## Why this is out of scope

The tag owns its word so the word and the colour can't disagree. The brief's rule is "Every status tag carries its word" (`docs/design-brief.md` § Colour), so a colour-blind admin can tell overdue from paid. A `label` prop would let a generated screen put "Paid" on an overdue tint, and no gate would catch it.

Copy that adds to a status, such as a date, sits beside the tag as its own Text, as the spec's screens already do: "Arrives Oct 24" on `payment-overview` and "Due " + `dueLabel` on `payment-status`.

```json
{ "id": "status", "component": "StatusTag", "props": [{ "name": "status", "value": { "bind": "overdueInvoice.status" } }] }
```

"Awaiting" doesn't need "approval": both admin screens that show it already say what it waits for. On `payment-run` the tag sits in a Card labelled **awaiting approval**, which a longer tag would repeat, and on `invoice-review` it sits beside **Approve and pay**.

## When to reconsider

When a contractor screen shows `awaiting`. To a contractor the invoice is waiting on the client, not on an approval they can give, so the word may need to differ by audience. That is a new decision, not a `label` prop: components never know which density they're in ([ADR 0002](../docs/adr/0002-token-only-tailwind-and-eslint-token-lint.md)), so StatusTag would need some other way to know its audience.

## Prior requests

- #130: "StatusTag gap: The status words are the brief's single words, and the tag owns them"
