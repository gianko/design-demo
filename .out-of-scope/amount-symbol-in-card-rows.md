# The currency symbol in a card's rows

Amount's `display` couples size to format: `card` is the large figure with the symbol (`$4,800.00`), and `table` is body size with the code (`4,800.00 USD`). A body-size amount in a label–value row inside a Card takes `table`, so it shows the code even on a single-currency card. There is no `size` prop beside a `format` prop, and no third `row` display with the symbol at body size.

## Why this is out of scope

The brief gives two formats, one for tables and one for a single-currency card, and nothing for a row under a card's figure. The code is never wrong: the brief chose it for tables so mixed currencies can't be misread, and it reads as well on one currency. The symbol only saves space.

No P0 screen brief has a body-size amount inside a Card. payment-status shows one amount as the card's figure, and payment-overview and payment-run show one figure per Card ([spec § Eval screen briefs](../docs/spec.md#eval-screen-briefs)). A second axis would be a prop no screen uses, and one more choice the spec step has to get right.

## When to reconsider

When a screen brief puts a body-size amount on a single-currency Card, such as a "Paid this year" row under the figure, and the code reads wrong there.

## Prior requests

- #123: "Amount gap: An amount in a single-currency card's detail row shows the code, not the symbol"
