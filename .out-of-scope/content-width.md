# A content width on Screen

Screen sets no maximum content width, and Stack has no narrow-column option. Screen stays a plain padded block. The one component that bounds its own width is Card, which caps itself at `size.max-width.card` (#147).

## Why this is out of scope

Line length is a typography setting. It is only right in `ch`, relative to the text's own size, so a parent's width can't express it, and a parent that holds headings, buttons or a table would narrow all of them. `lint/taste/RULES.md` (row `line-length`) gives line length to the component that holds the prose, so Text's `body` size is to set its own measure from a `size.width.measure` token (#95). As a `max-width` it is a ceiling, so Text still fills any narrower container.

A Stack `justify: between` row can put its label and value more than 1,000px apart directly in a Screen at 1280px. In the P0 briefs every label–value row sits inside a Card, so Card's width bounds it. Card caps itself, not a Screen or a Stack the spec step would have to choose. No P0 brief puts anything in a Card that must run full width, and a cap the spec step can't forget is safer than a layout choice no gate checks.

## When to reconsider

When Cards side by side come out uneven on a generated screen, such as `payment-overview`'s or `payment-run`'s three. Making them share a row equally needs a layout that sets columns (a Grid, the likely owner) or a minimum width that wraps sensibly on a phone. Also reconsider when a screen needs a deliberate narrow column outside a Card, such as a form.

## Prior requests

- #86: "Screen gap: No maximum content width"
- #113: "Stack gap: `justify: between` spreads a row across the full width of a wide screen"
- #147: "Card gap: Cards stretch to the full width of the screen" (went ahead as a cap on Card)
