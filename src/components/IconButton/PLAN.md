# IconButton: component plan

## Use

The close button Sheet renders in its header; never place it in a UI spec yourself. For an action a person takes use a Button, which names what happens in words.

It is an **internal entry** (ADR 0004, like Checkbox): the spec step never sees it, gate 1 rejects a UI spec node naming it, and the code step sees it marked `internal`. It becomes public only when a brief has an honest use for one (spec § After P1).

## Anatomy

Three slots, no Radix primitive: Radix isn't installed, and a native `<button type="button">` has the role, the keyboard behaviour and `disabled`.

- `root`: the `<button>`, carrying `data-component="IconButton"`. A square at the density's control height, so it lines up with Buttons in the same row ("Buttons, icon buttons … share the control height").
- `icon`: the Phosphor glyph, an `<svg aria-hidden>`, at the density's icon size, centred.
- `name`: the accessible name, visually hidden text inside the button (`sr-only`), as Checkbox carries its own. The glyph says what it does to a sighted person; the name says it to everyone else.

Props:

- `icon`: a name from the icon map, required. The map holds `close` today.
- `label`: the accessible name, a string, such as "Close invoice details". Required: an icon alone names nothing, and only the caller knows what it closes.
- `disabled`: boolean.
- React's own: `onClick` and `ref` (Sheet returns focus and wires Escape itself).

### The icon map

`icons.tsx` is the library's one Phosphor icon map (spec § P1: IconButton "brings the shared Phosphor icon map"). It maps a library name to a Phosphor icon and exports `Icon`, which renders one at the brief's size and weight: regular weight, `size-icon` (16px admin, 20px contractor, "Phosphor, regular weight: 16px on admin screens, 20px on contractor screens"), `aria-hidden`. Names say what the icon does in this product (`close`), not what it draws (`X`), so swapping a glyph is one line. It holds only the icons a component renders; a component that needs another adds it there. Each icon is imported from its own module (`@phosphor-icons/react/dist/csr/X`), so Vitest and the generator, which load the registry and so this file, never parse the whole set.

## Variants, sizes, states

No look variant: one quiet look, the only one Sheet needs, so a screen can't pick a loud one. Quiet is Button's `quiet`: bare at rest, so the close button never competes with the sheet's content. No size: density sets it (ADR 0002).

| State | How it shows | Brief line |
|---|---|---|
| rest | bare, `ink` glyph | "a bare one stays bare"; Button's quiet intent |
| hover | `surface-hover` fill | "`surface-hover` and `surface-pressed` deepen a neutral control" |
| pressed | `surface-pressed` fill | as hover |
| focus-visible | 2px heather outline, 2px off | "The focus ring shows on keyboard focus only" |
| disabled | bare, `disabled` glyph, no hover or pressed | "`disabled` and its text are a flat, quiet neutral"; "a bare one stays bare"; "natively disabled and leaves the tab order" |

No pending: closing starts no operation.

## Token map

| Slot | When | Classes |
|---|---|---|
| `root` | always | `inline-flex aspect-square h-control shrink-0 items-center justify-center rounded-control transition-colors duration-fast ease-standard focus-visible:focus-ring` |
| | enabled | `text-ink hover:bg-surface-hover active:bg-surface-pressed` |
| | disabled | `text-disabled` |
| `icon` | always | `size-icon` (in `icons.tsx`; the glyph fills in `currentColor`) |
| `name` | always | `sr-only` |

Radius `rounded-control` (6px), the radius table's "Buttons", so the hover fill matches a quiet Button's.

## A11y contract

- **Role**: `button`, native.
- **Accessible name**: `label`, as visually hidden text inside the button; the glyph is `aria-hidden`.
- **Keyboard**: Enter and Space, native; Tab reaches it. Focus ring on `:focus-visible` only.
- **Disabled**: native `disabled`, so it leaves the tab order and is announced unavailable.
- **Busy**: none; it starts no operation.
- **Target size**: a square of `h-control`: 32×32px admin (above the 24px floor), 44×44px contractor (the 44px minimum). Asserted as a style expectation, beside the glyph's 16px and 20px.

## Motion

| User action | Motion |
|---|---|
| hover, press | background colour, `transition-colors duration-fast ease-standard` ("`fast` 120ms (press, hover colour)") |
| click | none of its own: Sheet's closing is Sheet's motion |

No `settle`: closing isn't a confirmed result. Reduced motion: the colour transition is already a `fast` crossfade and nothing moves, so it stays.

## Against defaults

The default version: shadcn's `Button` with `variant="ghost" size="icon"`, a `size-9` square, `rounded-md`, a Lucide `XIcon` at `size-4`, `hover:bg-accent`, a 3px `ring` on focus-visible, `opacity-50` when disabled, and often `sr-only` "Close" text inside a Dialog's corner.

How this one differs:

- **Square at the density's control height, not `size-9`.** Brief: icon buttons "share the control height"; 44px contractor is the minimum target.
- **Glyph at the density's icon size, from Phosphor regular, not Lucide.** Brief: "Phosphor, regular weight: 16px … 20px".
- **Hover deepens a neutral, not the accent.** The accent is "for primary actions, selection and focus only".
- **Disabled is a colour role, not opacity** (ADR 0002), and stays bare.
- **Focus is an outline, offset, in the accent** (ADR 0002's `focus-ring`), not a translucent ring.
- **The name is the caller's**, "Close invoice details", not a generic "Close", since the label says what it closes.
- **Matches the default** in being bare at rest with a colour-only hover (no lift or shadow; the brief bans lift and is otherwise silent), its 6px radius (the radius table's "Buttons"), and visually hidden text as its name.
