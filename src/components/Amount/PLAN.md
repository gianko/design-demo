# Amount: component plan

## Use

An amount of money, from a value and its ISO currency code, always with cents and tabular figures: `display: card` for the one large figure a Card is about (`$4,800.00`), `display: table` for an amount in a table cell or at the end of a label–value row (`4,800.00 USD`), where it right-aligns. For copy use Text, for a title Heading, for a status StatusTag.

## Anatomy

One slot, `root`, a `<span>` carrying `data-component="Amount"`. Its content is the formatted amount, built from the `value` and `currency` props; it takes no children and has no registry slots, because Amount owns the format (spec § Component pieces 5: "it owns tabular figures, cents and currency format"). No Radix primitive: Amount isn't interactive.

Props, from spec § Component pieces 5 and ADR 0004 ("Amount (`value`, `currency`, `display: table|card`)"):

- `value`: a number in the currency's major unit, as the fixtures hold it (`amount: 4800` is 4,800.00).
- `currency`: an ISO 4217 code, three capitals, as the fixtures hold it (`currency: "USD"`).
- `display`: `card` or `table`, required.

Format, fixed to English (`en-US`) grouping because every string in the product is English:

- `card`: the currency's symbol before the digits, `$4,800.00`, from `Intl.NumberFormat`'s `currency` style. A currency whose symbol is ambiguous in English keeps its prefix (`CA$`), so a single-currency card is never misread.
- `table`: the digits, a no-break space, then the code, `4,800.00 USD`. The code goes last so the digits start where the column's other digits start and end where they end. The no-break space keeps the code from wrapping onto its own line.
- Cents: the currency's own minor unit from `Intl` (2 for USD, EUR, GBP). See GAPS.md for currencies without cents.

## Variants, sizes, states

| Variant | Options | Default | Brief line behind it |
|---|---|---|---|
| `display` | `card`, `table` | none: required | Brief, Type: "In tables: `4,800.00 USD`. On a single-currency card: `$4,800.00`." Spec § Component pieces 5: "`display: table` or `card`". Required, as Heading's `level` is: the two formats read differently, and a default would hide the choice. |

Each display is a type role:

- **card → `figure`** (32/40, 600, −0.64px, which is −0.02em). Brief: "Titles (24px and up) and a single large figure use 600 with slightly tightened tracking (… −0.02em for the figure)".
- **table → `body`** (14/20 admin, 16/24 contractor, 400). Brief: "Body text 14px / 16px" in the density table. An amount in a row reads at the row's size; it is data, not a title, so 400.

No size or tone props: the figure is the only large money on the scale, and money is ink (a muted or status-coloured amount would be "colour alone" carrying meaning, and "status colours are their own set"). No sign or credit styling: the brief has no refunds.

States: none. Amount isn't interactive, so rest is its only state; hover, pressed, focus-visible, disabled and pending don't apply.

## Token map

| Slot | Variant | Classes | Why |
|---|---|---|---|
| `root` | always | `text-ink tabular-nums` | "Amounts always use tabular figures"; "Text is a plum-tinted ink". |
| | `display: card` | `text-figure` | Composite: 32/40, 600, −0.64px. |
| | `display: table` | `block text-right text-body` | "right-align in tables": as a block the span fills its cell or row slot, and its digits end at the end edge, so a column of amounts lines up on the cents whatever holds it. Composite body: density size, 400. |

`tabular-nums`, `block` and `text-right` are keywords, not values. No margin, padding or colour fill: spacing is Stack's (ADR 0002), and surfaces are Card's.

## A11y contract

- **Role**: none; a `<span>` of text. The formatted string is what is read: "$4,800.00" and "4,800.00 USD", which screen readers speak as money and as digits followed by the code.
- **Accessible name**: none needed; the text is the content.
- **Keyboard and focus**: not focusable.
- **Disabled, busy**: not applicable.
- **Target size**: none; not a target.
- Colour alone carries nothing: the currency is always written, as a symbol or a code.

## Motion

None. An amount has no user action. One that changes or appears with a screen state is carried by `useScreenState`'s View Transition (ADR 0011), not by Amount. No counting-up animation: that is motion the system starts, and the brief allows motion "only when the user acts". Reduced motion: nothing to reduce.

## Against defaults

The default version: shadcn has no Amount; screens write `` `$${amount.toFixed(2)}` `` or `toLocaleString()` into a `<div className="text-2xl font-bold">`, proportional digits, the symbol whatever the context, and money in a table left-aligned unless someone remembers `text-right`.

How this one differs:

- **Two formats by context, not one.** The card shows the symbol; the table shows the code after the digits. Brief: "multi-currency lists must be impossible to misread, and digits must line up."
- **Tabular figures always.** Brief: "Amounts always use tabular figures". The default leaves proportional digits, so a column of amounts zigzags.
- **Cents always.** Brief: "show cents". The default `toLocaleString()` drops `.00` from whole amounts.
- **Right-aligned by the component.** In a table, the default relies on each cell's own class; here the table display aligns itself. Brief: "right-align in tables".
- **600, not bold, at 32px, not `text-2xl`.** Brief: "weights 400 and 600 only"; "Scale … 12, 14, 16, 20, 24, 32", and 32 is the figure's.
- **No count-up, no gradient, no small label bundled under it.** Brief, banned: "Big number + small label + supporting stats + gradient as the default hero"; the label is the screen's own Text, if it needs one.
- **Matches the default** in rendering a bare inline run of text with no element semantics, where the brief says nothing about machine-readable values.
