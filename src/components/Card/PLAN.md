# Card: component plan

## Use

A flat surface that groups the facts about one thing, such as an invoice or a payment, with an optional `header` (its title, often beside its StatusTag), a `body` and an optional `footer` (its action). Never put a Card inside a Card. For layout without a surface use Stack. For a list of many invoices, a DataTable is the right choice once it exists.

## Anatomy

Four `tv()` slots, all `<div>`s. The root carries `data-component="Card"`:

- `root`: the surface. It is a flex column, so its three parts sit apart by one gap.
- `header`: the `header` registry slot, a `ReactNode` prop. Rendered only when given.
- `body`: the `body` registry slot, which is `children`. Always rendered. Wrapped in a div so that several children read as one part rather than taking the gap between each of them.
- `footer`: the `footer` registry slot, a `ReactNode` prop. Rendered only when given.

No Radix primitive: a Card isn't interactive, and it is neither a dialog nor a disclosure.

Registry slots and their allow-lists (ADR 0004: "an allow-list where nonsense is likely"):

| Slot | Allows | Why |
|---|---|---|
| `header` | Heading, Text, StatusTag, Stack | A title, maybe beside its status in a row. Money and actions don't go in a title. |
| `body` | any | The card's content. Nested cards are taste lint's job (`nested-cards`). |
| `footer` | Button, Text, Stack | The card's action, or a short note under it. |

Props: none besides the slots. Spec § Component pieces 8 asks for a surface and three named slots, and nothing else.

## Variants, sizes, states

None.

- **No variants.** Spec 8 names one look: "a flat surface with a `line` hairline and the density's surface radius". The brief's elevation line puts cards at **flat**, so there's no `raised` or `elevated` option: "a shadow means 'this floats', never 'this is a box'". There's no tone or status-tinted card either: "status colours are their own set", and the StatusTag carries status. Every variant would be a choice a generated screen can get wrong.
- **No size.** Density sets the radius (ADR 0001: surface radius is a density token). Padding is fixed (see gaps).
- **No states.** A Card isn't interactive: it has no hover, pressed, focus or disabled state, and the brief bans "hover lift on cards or rows". Its controls (a Button in the footer) carry their own states.

## Token map

| Slot | Classes | Brief line behind it |
|---|---|---|
| `root` | `flex flex-col gap-md rounded-surface border border-line bg-surface p-lg` | Elevation: "flat (page and cards, separated by a `line` hairline)" sets `border border-line` and no shadow. Radius table: "Surfaces, admin 8px / contractor 12px" sets `rounded-surface`, a density token. Colour roles set `bg-surface` on `page`, a step lighter in dark ("surfaces get lighter as they rise"). `p-lg` (24px) and `gap-md` (20px) are on the 4px scale. |
| `header` | none | Content only. |
| `body` | none | Content only. |
| `footer` | none | Content only. A Button sits at the start, as left-aligned work surfaces have it. |

The border and the fill are on the one slot, and there's no shadow, so `edge-treatment` holds. No inner radius, so concentric corners don't come up.

## A11y contract

- **Role**: none, a plain `<div>`. Its title is whatever Heading the header holds, so the screen's heading outline gives a screen reader the card's structure without a landmark per card. A `<section>` with no accessible name has no role, and naming it would need an id link that a generated screen can't make.
- **Accessible name**: none needed.
- **Keyboard and focus**: not focusable. A Button in the footer is reached in source order: header, body, footer.
- **Disabled, busy**: not applicable. A pending Button inside marks itself busy.
- **Target size**: not a target.
- **Contrast**: content sits on `surface`, and the token build AA-checks ink-muted on surface (ADR 0005).

## Motion

None. "Banned: hover lift on cards or rows" and "fade-and-slide-up entrances". A card that appears or changes with a screen state is animated by the screen-state View Transition (ADR 0011), not by the Card. Reduced motion: nothing to reduce.

## Against defaults

The default version is shadcn's `Card`: `rounded-xl border bg-card shadow-sm`, plus `CardHeader` / `CardTitle` / `CardDescription` / `CardContent` / `CardFooter` subcomponents with `p-6` each, where the title is a styled `div` and the footer an `items-center` flex row. It is the SaaS-card kit's unit: one radius and one soft grey shadow on everything.

How this one differs:

- **No shadow.** Elevation: cards are flat, separated by a hairline; "a shadow means this floats". Banned: "the same `rgba(0,0,0,.1)` shadow".
- **Radius follows density (8px / 12px), not one fixed `rounded-xl`.** Radius table; banned: "one radius everywhere".
- **Slots are props, not subcomponents.** The UI spec fills named slots (ADR 0004), and the Card owns the spacing between them, so no screen re-pads a header.
- **No title or description of its own.** The header takes a Heading, so the card's title joins the screen's heading outline instead of being a styled `div`, and the type stays on Heading's scale.
- **Plum-tinted surface and hairline**, not grey: "every neutral is tinted toward plum".
- **Matches the default**, where the brief is silent: a bordered block with header, content and footer stacked in that order, and the footer's action at the start.
