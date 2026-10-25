# Card as an `<article>` or a named `<section>`

Card renders a plain `<div>` with no role. It doesn't render an `<article>`, or a `<section>` with `aria-labelledby` pointing at its header's Heading.

## Why this is out of scope

The Heading in a Card's header already puts the card in the screen's heading outline, so a screen reader can list the cards and jump between them by heading. Axe passes. A `<section>` becomes a `region` landmark only when it has a name, and naming it would mean Card finding or being handed its Heading's id, which a flat UI spec has no way to pass ([ADR 0004](../docs/adr/0004-flat-library-only-ui-spec-and-zod-first-registry.md)). An `<article>` needs no name, but it adds a role without adding a way to navigate. The P0 screens hold one to three cards, which headings already cover.

This follows Screen and Stack: Screen is the page's one landmark (`screen-landmark.md`), and Stack has no list semantics (`stack-list-semantics.md`).

## When to reconsider

When a screen holds enough cards that moving between them by heading is slow, or when an accessibility audit asks for card regions.

## Prior requests

- #149: "Card gap: Card has no semantic grouping"
