# PageHeader without a description slot, or with a string one

PageHeader has an optional `description` slot under its title, allow-listed to Text and Stack. It is neither left out nor a `description: string` prop that PageHeader renders muted.

## Why this is out of scope

Spec § Library widening names only a title and an `actions` slot, and leaves the rest of the anatomy to the component plan. payment-run's brief asks for "the run's date in the PageHeader", and the fixture's `paymentRun.dateLabel` is only "Oct 24". Bound to the title, it would make the screen's `<h1>` read "Oct 24". Without the slot the date falls into the body, out of the header the brief puts it in.

A string prop couldn't hold it either: a binding is a whole prop value, `{ "bind": "<path>" }` ([ADR 0004](../docs/adr/0004-flat-library-only-ui-spec-and-zod-first-registry.md)), so one string can't join "Runs" to the bound "Oct 24". A Stack row of two Texts can. PageHeader styles nothing in the slot; the Text sets its own tone, as Text does everywhere else.

## When to reconsider

When generated screens use the slot for things that aren't a line of context, such as a second heading or a paragraph of help. Narrowing the allow-list to Text alone would stop that, at the cost of payment-run's literal-plus-bound line.

## Prior requests

- #175: "PageHeader gap: PageHeader has a description slot the spec doesn't name"
