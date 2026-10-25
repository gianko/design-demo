# One large figure per screen

`display: card` is always the `text-figure` role (32px, 600, −0.02em), one per Card, however many Cards a screen has. There is no smaller card display for screens with several Cards, and the `use` line doesn't limit `display: card` to once per screen.

## Why this is out of scope

The brief reserves the figure treatment for "a single large figure". Amount reads that as one per Card: each Card is about one amount, so each gets the figure. payment-overview and payment-run ask for three Cards with an amount each ([spec § Eval screen briefs](../docs/spec.md#eval-screen-briefs)), and three figures side by side are a row of totals, a common way to show them.

The alternatives each cost more:

- A smaller card display would make the spec step choose a size by counting Cards, a judgment it can get wrong and no gate checks.
- Limiting `display: card` to once per screen would leave a summary's other totals at body size, beside one that is twice as large, as if they mattered less.

## When to reconsider

When payment-overview or payment-run is generated and three figures read as too loud in review.

## Prior requests

- #124: "Amount gap: Several card figures on one screen"
