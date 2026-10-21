# Button: component plan

**Use**: the one action a person takes from here: approve, pay, save, send. Reach for `primary` for the single main action on a screen or bar, `secondary` for the rest. Not for navigation (a link) or for filters (segmented filter).

## Anatomy

A native `<button>`, no Radix primitive: a button has no behaviour Radix adds. `tv()` slots:

- `root`: the button.
- `icon`: optional leading Phosphor icon (regular weight), `aria-hidden`.
- `label`: the visible text; it is the accessible name.
- `edge` and `sweep`: the pending progress edge along the bottom (only while pending).

## Variants, sizes, states

- **`intent`: `primary` | `secondary`.** Brief: "one accent, heather … for primary actions"; `control` is "the 3:1 edge of an input or secondary button". No ghost, no destructive: the brief names neither (see GAPS).
- **No size prop.** Size follows the density set ([ADR 0001](../../../../docs/adr/0001-density-by-audience.md)): `text-label` 14/16px, `min-h-target` 24/44px, `size-icon` 16/20px.
- **States**, each visibly distinct from rest:
  - rest; hover (deeper fill); pressed (deeper still); focus-visible (2px heather outline, offset 2px);
  - disabled: flat quiet neutral fill and text, edge dropped ("`disabled` and its text are a flat, quiet neutral");
  - pending: keeps its intent colours, ignores hover/press, shows the progress edge ("a pending action shows a progress edge along its button's bottom").

## Token map

| Slot · state | primary | secondary |
|---|---|---|
| root, base | `relative inline-flex min-h-target min-w-target items-center justify-center gap-2xs overflow-hidden rounded-control border px-sm py-3xs text-label transition-colors duration-fast ease-standard focus-visible:focus-ring` | same |
| root, rest | `border-transparent bg-accent text-on-accent` | `border-control bg-surface text-ink` |
| root, hover | `hover:bg-accent-hover` | `hover:bg-surface-hover` |
| root, pressed | `active:bg-accent-pressed` | `active:bg-surface-pressed` |
| root, disabled | `border-transparent bg-disabled text-disabled cursor-not-allowed` | same |
| root, pending | `cursor-progress`, no hover/pressed classes | same |
| icon | `size-icon shrink-0` | same |
| edge | `absolute inset-x-0 bottom-0 h-edge origin-left animate-progress-fill overflow-hidden` | same |
| sweep | `block size-full bg-on-accent animate-progress-sweep` | `… bg-accent …` |

## A11y contract

- Role `button` (native); accessible name is the label text; the icon is `aria-hidden`.
- Enter and Space activate (native). Focus ring on `:focus-visible` only, never on click.
- Disabled: native `disabled`, out of the tab order; nothing to announce.
- Pending: `aria-busy="true"` and `aria-disabled="true"`, stays focusable so keyboard focus doesn't drop to the page mid-operation; clicks are swallowed.
- Target: `min-h-target min-w-target`, 24px admin (rendered 30px tall), 44px contractor.

## Motion

- Hover and press: background colour over `duration-fast` + `ease-standard` ("fast 120ms: press, hover colour").
- Pending: `edge` fills once over `slow` (`animate-progress-fill`), then `sweep` slides along it until `pending` turns false (`animate-progress-sweep`). The brief's one loop.
- Reduced motion: tokens.css strips animations, so the edge renders full and still ("a static edge"); colour changes stay a `fast` crossfade.

## Against defaults

shadcn's button: `h-9 px-4 py-2 rounded-md text-sm font-medium`, solid near-black primary, `outline`/`ghost`/`destructive`/`link` variants, `sm`/`lg`/`icon` sizes, a ring on focus and `opacity-50` when disabled, a spinner when loading.

- Heather fill, not near-black or indigo: "one accent, heather … for primary actions"; banned "the 8px-grid indigo button".
- Two intents, no size prop: density sets size ([ADR 0001]); "fewer variants" is this skill's rule, the brief names only primary actions and the secondary control edge.
- 6px `rounded-control`, never a pill: radius table.
- Weight 600 from `text-label`, not 500: "weights 400 and 600 only".
- Disabled is a neutral colour role, not opacity: "`disabled` and its text are a flat, quiet neutral" (ADR 0002 bans `opacity-*`).
- Pending is a progress edge, not a spinner: "the one loop"; spinners loop by default with no fill.
- Focus outline on `:focus-visible` only: matches shadcn's modern default; the brief demands it too.
- No pointer cursor at rest: the native button cursor; hover colour already says "clickable". Cursor changes only where it carries news (`cursor-progress` pending, `cursor-not-allowed` disabled).
- Horizontal padding 16px and centred label: matches the default; the brief is silent.
