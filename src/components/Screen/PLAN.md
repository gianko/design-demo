# Screen: component plan

## Use

The root of every generated screen, exactly once: set `audience` from the screen brief and put the screen's content in `body`. Nothing else is ever a root, and a Screen is never nested; for grouping inside the screen reach for Stack, for a surface reach for Card.

## Anatomy

One slot, `root`, a `<main>` element carrying `data-component="Screen"` and `data-density={audience}`. Its children are the registry slot `body`, open to every registered component. No Radix primitive: there is nothing interactive to own.

Screen lays nothing out. Spacing between its children belongs to Stack (ADR 0002, "Stack and Grid take token-union props for layout spacing"), so a screen with more than one child at the top level wraps them in a Stack.

## Variants, sizes, states

| Variant | Options | Brief line behind it |
|---|---|---|
| `audience` | `admin`, `contractor` | "Density follows who's looking" and the density table; ADR 0001; ADR 0004 ("the screen root sets `data-density` from it"); spec § Component pieces 1. |

No default: every UI spec states its audience (ADR 0001, "Each screen brief has to say which audience it serves"), so the prop is required and the generator can't fall back to one silently.

No sizes; density is the size. No theme prop: theme is the surrounding `data-theme` scope (ADR 0002), as for every component.

States: none. Screen is not interactive, so rest is its only state; hover, pressed, focus-visible, disabled and pending don't apply. The screen-state data attribute of ADR 0011 arrives with `useScreenState` (spec § Action wiring), not here; see GAPS.md.

## Token map

| Slot | State | Classes | Why |
|---|---|---|---|
| `root` | rest, both audiences | `bg-page` | The page role; Screen is what the page is. |
| | | `p-page` | Spec: Screen "applies `p-page`" (28px admin, 36px contractor). |
| | | `text-body` | The density's body size and line height, so bare copy inside inherits the right one (14/20 admin, 16/24 contractor). |
| | | `text-ink` | Text is plum-tinted ink, never the browser's black. |

No `font-sans`: the closed theme sets Instrument Sans as `--default-font-family`, so naming it again on the root was an accessory (removed in the screenshot critique).

`audience` adds no class: it sets `data-density`, and the density variables above resolve under it (ADR 0002, "Density is a CSS scope").

## A11y contract

- **Role**: `main` landmark, implicit from `<main>`. A screen is the page's main content, and one per UI spec matches one `main` per page.
- **Accessible name**: none; the screen's level-1 Heading names the page.
- **Keyboard and focus**: not focusable itself; tab order is its children's DOM order.
- **Disabled, busy**: not applicable.
- **Target size**: none of its own. It sets `data-density`, which sets `min-h-target` (24px admin, 44px contractor) for every control inside.

## Motion

None. Screen starts no motion, and the brief bans entrance animations on page load. State changes inside it run as View Transitions owned by `useScreenState` (ADR 0011), not by this component. Reduced motion: nothing to reduce.

## Against defaults

The default version: a shadcn app usually has no Screen at all, just a layout `<div className="container mx-auto max-w-7xl p-6">` with `bg-background text-foreground` on `body`, and a `min-h-screen` flex column holding a header and content.

How this one differs:

- **Density is a prop, not a breakpoint or a container size.** `audience` flips the whole density set (padding, body size, control height, target size). Brief: "Two people use the screens, and density follows who's looking."
- **No max-width or centring container.** The brief gives page padding per density and nothing else; a centred `max-w-7xl` column is the template default. Matches the default in being a plain block where the brief is silent on layout (see GAPS.md on width).
- **Plum page and ink, not white and black.** Brief: "Every neutral is tinted toward plum. No pure grey."
- **No header, footer or flex column built in.** A screen's structure comes from the UI spec's nodes (ADR 0004, "The UI spec carries layout and copy"), so Screen holds no chrome of its own.
- **Quiet.** No shadow, border, radius or motion: a page is flat ("flat (page and cards, separated by a `line` hairline)"), and boldness belongs to motion on generated screens.
