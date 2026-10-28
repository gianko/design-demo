# PageHeader: component plan

## Use

The top of a screen: its level 1 Heading in `title`, an optional line of context under it in `description` (a run's date), and the screen's own actions in `actions`, at the end of the row. Once per screen, first in it. For a section's title use a Heading alone; for an action about one invoice put its Button in that invoice's Card footer.

## Anatomy

Three `tv()` slots. The root carries `data-component="PageHeader"`:

- `root`: a `<header>`, a wrapping flex row. Inside `<main>` (Screen) a `<header>` has no banner role, so it adds no landmark; it only says the block introduces the page.
- `heading`: a flex column holding the `title` and `description` registry slots, unwrapped (Heading, Text and Stack are already blocks). It takes the room left in the row.
- `actions`: a flex row holding the `actions` registry slot. Rendered only when given.

No Radix primitive: nothing here is interactive except the Buttons, which bring their own behaviour.

Registry slots and their allow-lists (ADR 0004):

| Slot | Allows | Why |
|---|---|---|
| `title` | Heading | The screen's title. A slot rather than a string prop, so gate 1's heading checks see it: a `title` string rendered as an `<h1>` would be invisible to "one level 1, no skips", and every Card header Heading under it would fail `heading-one`. |
| `description` | Text, Stack | One line of context, such as payment-run's run date. Stack lets literal copy sit beside a bound label ("Runs" + "Oct 24"). |
| `actions` | Button | Spec § PageHeader, Checkbox and DataTable: "allow-list is Button alone, until IconButton exists". Several Buttons are siblings in the slot; the slot lays them out as a row. |

Props: none besides the slots. Spec § Library widening asks for "title and an `actions` slot".

## Variants, sizes, states

None.

- **No variants.** One header look; the brief has no hero and bans "big number + small label + supporting stats" as a default treatment, so there's no "large" header, no tinted band and no bordered one.
- **No size.** Density changes nothing PageHeader owns: the type in it is Heading's and Text's, and controls are the Buttons' own height. Spacing between nodes isn't on ADR 0001's list.
- **No states.** Not interactive. The Buttons carry hover, pressed, focus-visible, disabled and pending.

## Token map

| Slot | Classes | Brief line behind it |
|---|---|---|
| `root` | `flex flex-wrap items-center justify-between gap-sm` | Actions sit at the end of the title's row, the convention of the brief's references (Stripe, Linear) for page actions. `flex-wrap`: on a phone, "often on a phone", the actions move under the title instead of squeezing it. `items-center` lines a Button up with a one-line title and with a title-plus-description block. `gap-sm` (16px) keeps a wrapped Button off the title; fixed at both densities (`.out-of-scope/density-aware-gaps.md`). No fill, border or padding: it sits on `page`, inside Screen's `p-page`; "a shadow means this floats", and a header that doesn't float has none. |
| `heading` | `flex grow flex-col gap-3xs` | `grow` from its own width: a title that fits beside the actions takes the room they leave; one that doesn't fills the row, and the actions wrap under it rather than squeezing it into a narrow column. `gap-3xs` (4px) keeps the description with its title. |
| `actions` | `flex flex-wrap items-center gap-2xs` | Several Buttons in one row, 8px apart, the same row height ("controls in one row line up"). |

## A11y contract

- **Role**: `<header>` inside `<main>`, so no landmark role. The `title` slot's Heading is the page's `<h1>`, the first entry in the heading outline.
- **Accessible name**: none needed.
- **Keyboard and focus**: not focusable. Its Buttons follow the title in source order, so a keyboard user reads the title, then reaches the actions.
- **Disabled, busy**: not applicable; a pending Button marks itself busy.
- **Target size**: not a target. The Buttons are 32px admin and 44px contractor; 8px between them keeps admin targets clear of the 24px spacing rule.

## Motion

None. An action that appears with a screen state (a `when` naming it) enters through the screen-state View Transition (ADR 0011), not through the PageHeader. An action on the Selection sits in DataTable's footer, not here (ADR 0013). "Banned: entrance animations on page load". Reduced motion: nothing to reduce.

## Against defaults

The default version: a shadcn-style page header, a `div` with an `h1` in `text-3xl font-bold tracking-tight`, a `text-muted-foreground` paragraph under it, actions at the end, often with a bottom `border-b pb-4` or a breadcrumb and an uppercase eyebrow above the title.

How this one differs:

- **The title is the library's Heading in a slot**, not a styled `h1` of its own: 24px at 600 with −0.015em, "Titles (24px and up) … 600 with slightly tightened tracking", and gate 1 counts it.
- **No eyebrow, kicker or breadcrumb above the title.** Banned: "tracked-out ALL-CAPS eyebrows", "unnecessary typographic labels above content".
- **No bottom rule.** Elevation: hairlines separate surfaces; the header isn't one. Banned: "Broadsheet: hairline rules".
- **Actions are Buttons only**, through the allow-list, not any node.
- **Matches the default**, where the brief is silent: title at the start, actions at the end of the same row, context under the title.
