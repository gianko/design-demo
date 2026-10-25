# Always two decimals

Amount shows each currency's own minor unit, from `Intl.NumberFormat`: `4,800.00 USD`, `480,000 JPY`, `1,250.000 KWD`. It doesn't force two decimals on every currency.

## Why this is out of scope

The brief says amounts "show cents" so a figure is exact, never rounded to the dollar. A currency without a minor unit has no cents to show, and `480,000.00 JPY` would show a fraction no one can pay. Every currency that has cents shows them.

The cost is in gate 7: the `tabular-numerals` rule only recognises money with exactly two decimals, so a JPY or KWD amount written outside Amount, such as in a Text, would pass unchecked. Amount itself always sets tabular figures, whatever the currency. The fixtures hold only USD, so no P0 screen has such an amount.

## When to reconsider

When the fixtures gain a currency without two decimals. Then widen the `tabular-numerals` rule to recognise it, rather than changing the format.

## Prior requests

- #125: "Amount gap: Currencies without cents"
