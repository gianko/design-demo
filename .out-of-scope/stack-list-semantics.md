# List semantics on Stack

Stack always renders a plain `<div>` with no role. It has no `as: list` option that renders `<ul>` and wraps each child in an `<li>`.

## Why this is out of scope

The flat UI spec repeats a node only in a DataTable's `cell` slot ([ADR 0004](../docs/adr/0004-flat-library-only-ui-spec-and-zod-first-registry.md)), so a brief never asks for a list drawn any other way (spec § Rules every brief follows). A fixed set of named cards, such as `payment-overview`'s three, isn't a list. List semantics belong to DataTable, which renders the screen's only repeated rows.

## Prior requests

- #114: "Stack gap: Stack has no semantic element"
