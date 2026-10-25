# Amount: gaps

Each entry is one place the brief, ADRs or tokens didn't decide something Amount needed, the call made, and the alternative a human might prefer.

## An amount in a single-currency card's detail row shows the code, not the symbol

**Undecided:** the brief gives two formats, "In tables: `4,800.00 USD`. On a single-currency card: `$4,800.00`", and the spec gives Amount `display: table|card`. That couples format to size: `card` is the 32px figure with a symbol, and `table` is body size with a code. A label–value row inside a single-currency Card, such as "Paid this year … 38,412.75 USD" under the figure, is neither a table nor the card's one figure. The brief doesn't say which format a body-size amount on a card takes.

**Call:** `table` covers every body-size amount, in a cell or at the end of a row, so a row on a card reads `38,412.75 USD` (see the InRow story). The registry's `use` line says so.

**Alternative:** split the two axes, with a `size: figure|body` prop beside a `format: symbol|code` prop, or add a third display (`row`: body size with the symbol), so a single-currency card's rows match its figure.

## Several card figures on one screen

**Undecided:** the brief reserves the 32px, 600, −0.02em treatment for "a single large figure". But `payment-run` asks for three Cards, each with a `display: card` Amount, and `payment-overview` asks for three Cards with an amount each. Three 32px figures side by side are no longer a single figure.

**Call:** `display: card` is always `text-figure`, one figure per Card. The brief's "single" is read as one per card, not one per screen.

**Alternative:** a smaller card display (24px `title`) for screens with several cards, chosen by the spec step, or a `use` line that tells the spec step to use `display: card` once per screen and `table` everywhere else.

## Currencies without cents

**Undecided:** the brief says amounts "show cents", and the fixtures hold only USD. Some ISO 4217 currencies have no minor unit (JPY, KRW) and some have three (KWD, BHD). The `tabular-numerals` rule only recognises money with exactly two decimals, so an amount in those currencies would pass gate 7 unchecked (Amount still sets tabular figures on it).

**Call:** each currency's own minor unit, from `Intl.NumberFormat`: `4,800.00 USD`, `480,000 JPY`, `1,250.000 KWD`. Every currency with cents shows them.

**Alternative:** always two decimals, so `480,000.00 JPY` matches the brief's wording literally and the taste rule sees it, at the cost of showing a fraction the currency doesn't have.

## The currency prop accepts any three capitals

**Undecided:** the spec names a `currency` prop, but not its type. The fixtures type it as the literal `"USD"`. ISO 4217 has about 300 codes.

**Call:** `z.string().regex(/^[A-Z]{3}$/)`, described as an ISO 4217 code. A well-formed code that isn't a real currency (`ABC`) passes gate 1, and `Intl` formats it with the code as its symbol (`ABC 4,800.00` on a card).

**Alternative:** a `z.enum` of the codes the fixtures use (only `USD` today, growing with them), so gate 1 rejects anything else, or of `Intl.supportedValuesOf("currency")`, which adds about 300 values to the registry in the spec step's cached prefix.
