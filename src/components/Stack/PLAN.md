# Stack: component plan

## Use

Lays out two or more nodes in a column or a row, with a gap from the spacing scale between them. It holds the layout of every screen, inside Screen and inside Card slots. Use it any time more than one node sits in a slot. It paints nothing: for a surface use Card, and for a page use Screen.

## Anatomy

One slot, `root`, a `<div>` carrying `data-component="Stack"`, set to `display: flex`. Its children are the registry slot `body`, which takes any registered component and has no allow-list, because any node can be laid out. No Radix primitive: Stack isn't interactive.

## Variants, sizes, states

| Variant | Options | Default | Brief line behind it |
|---|---|---|---|
| `direction` | `column`, `row` | `column` | Spec § Component pieces 2: "direction". ADR 0004: "Stack and Grid nodes with token props hold the full layout". Column is the default because screens are read top to bottom, and the contractor is often on a phone. |
| `gap` | `0`, `3xs`, `2xs`, `xs`, `sm`, `md`, `lg`, `xl`, `2xl`, `3xl`, `4xl` | `sm` | Spec: "token-union gap". ADR 0002: "Stack and Grid take token-union props for layout spacing". Brief: "Spacing on a 4px base, named steps only: 0, 4, 8 … 64". All eleven steps are offered, because a token union means the whole scale. `sm` (16px) is the default because it is the middle step that reads as one group at either density. See GAPS.md. |
| `align` | `stretch`, `start`, `center`, `baseline` | `stretch` in a column, `center` in a row | Spec: "alignment". This is the cross axis. Stretch lets a Card in a column fill its width. Start lets a column's children keep their own width. Center lines up a row's mixed heights (Text beside a StatusTag), as the brief's "controls in one row line up" implies. Baseline is for a figure beside its label. There is no `end`: right-aligned money belongs to tables and Amount ("right-align in tables"), and the screenshot critique cut it as the one accessory. |
| `justify` | `start`, `between`, `end` | `start` | Spec: "alignment", along the main axis. `between` puts an Amount at the far end of its row, as in Stripe's money rows. `end` sits an action at the end of a row. There is no `center`: the brief never centres content, and a centred column is the template hero. See GAPS.md. |

A row always wraps (`flex-wrap`), so on a contractor's phone a long client name pushes its neighbour onto the next line instead of spilling out. This is not a prop. "Responsive down to mobile" is `frontend-design`'s quality floor, and `text-overflow` is a P0 taste rule. See GAPS.md.

There are no sizes, because density doesn't touch the gap (ADR 0001 lists what density changes, and spacing between nodes isn't on the list). There are no states either: Stack isn't interactive, so rest is its only state, and hover, pressed, focus-visible, disabled and pending don't apply.

## Token map

| Slot | Variant | Classes |
|---|---|---|
| `root` | always | `flex` |
| | `direction: column` | `flex-col` |
| | `direction: row` | `flex-row flex-wrap` |
| | `gap: <step>` | `gap-<step>` (`gap-0` … `gap-4xl`), one class per spacing token |
| | `align: stretch / start / center / baseline` | `items-stretch` / `items-start` / `items-center` / `items-baseline` |
| | `justify: start / between / end` | `justify-start` / `justify-between` / `justify-end` |

`flex`, `flex-*`, `items-*` and `justify-*` are keyword utilities, not values, so the closed theme keeps them. The only value in the map is the gap, and it comes from the spacing tokens. There's no colour, padding, radius, border or shadow: Stack is layout, and painting belongs to Screen and Card.

## A11y contract

- **Role**: none. A `<div>` is a generic container, so the reading order is the children's DOM order, which matches the visual order. `row-reverse` and `order` are left out so the two can't diverge (WCAG 1.3.2).
- **Accessible name**: none.
- **Keyboard and focus**: not focusable. Tab order is the children's.
- **Disabled, busy**: not applicable.
- **Target size**: none of its own. A row's gap is what keeps two 24px admin targets apart, which is the brief's "spacing rule included". At `gap-0` that falls to the controls themselves.

## Motion

None. Stack starts no motion and has no user action of its own. A child entering or leaving because of a state change is animated by the View Transition that `useScreenState` runs (ADR 0011), not by Stack. Reduced motion: nothing to reduce.

## Against defaults

The default version: shadcn has no Stack. Screens write `<div className="flex flex-col gap-4">` or `space-y-6`, with any number on Tailwind's scale, often `items-center justify-center` for a centred block, plus `md:flex-row` breakpoints.

How this one differs:

- **The gap is a token name, not a number.** `gap="sm"` compiles to 16px, and `gap-4` is an unknown class. Brief: "Spacing on a 4px base, named steps only … Off-scale values fail lint". ADR 0005 explains why the names aren't pixels.
- **No `space-y-*` margins.** The gap belongs to the parent, so a child never pushes its neighbours by a rule of its own (Text's plan: "No built-in margin").
- **No centring along the main axis.** The brief's layouts are left-aligned work surfaces (Stripe, Linear), not centred heroes. Banned: "Big number + small label … as the default hero".
- **Rows wrap rather than switch at a breakpoint.** There are no breakpoint props, because the UI spec carries no responsive vocabulary, and wrapping covers the contractor's phone. See GAPS.md.
- **No `className` or `style`** (ADR 0002). Every layout choice is a typed prop the registry can describe.
- **Matches the default** in being a bare flex `<div>` with no semantics, where the brief says nothing about list or section markup.
