# Checkbox: component plan

## Use

The row selector DataTable renders, one per row and one in the header to select every row; never place it in a UI spec yourself. To act on a selection use a Button, and to show a status use StatusTag.

## Anatomy

Four slots, no Radix primitive: Radix isn't installed, and a native `<input type="checkbox">` already has the role, the keyboard behaviour, `disabled` and the mixed state (its `indeterminate` property). The spec asks for a row selector only (§ Library widening 2), nothing a native input lacks.

- `root`: a `<label>`, carrying `data-component="Checkbox"`. It is the hit area: a square at the density's minimum target, with the box centred in it.
- `input`: the native checkbox, laid over the whole root with its own look removed (`appearance-none`), so the element that takes the click, the focus and the target-size check is the full target, not the 16px box.
- `box`: a `<span aria-hidden>` after the input, the drawn square. It follows the input's hover, press and focus through `peer-*`.
- `mark`: an `<svg aria-hidden>` over the box, the tick when checked and a dash when mixed. Rendered only when there is something to mark.

The accessible name is a visually hidden text in the label (`sr-only`): in a table the row itself says what it is, so the box carries no visible copy.

Props:

- `label`: the accessible name, a string, such as "Select INV-0142". Required: an unnamed checkbox fails axe, and only the caller knows the row.
- `checked`: `false` (the default), `true` or `"mixed"`, the WAI-ARIA values; `"mixed"` is the header's when some rows are selected.
- `disabled`: boolean.
- `locked`: boolean (#297). DataTable sets it on every Checkbox while an action in its footer runs, so the selection holds still until the action settles (ADR 0013).
- React's own: `onCheckedChange(checked: boolean)` and `ref`. The component is controlled: DataTable owns selection (spec § PageHeader, Checkbox and DataTable; ADR 0011), so a click only reports the change, and the box shows what `checked` says.

No visible-label variant: Checkbox as a form field is out of P0 (spec § Rules every brief follows: "Not in P0: form screens (Input, Select, Checkbox as a field)").

## Variants, sizes, states

No look variant: one row selector, one look. No size: density sets it (ADR 0002).

| State | How it shows | Brief line |
|---|---|---|
| unchecked, rest | `surface` square, `control` edge, 4px corners | "`control` is the 3:1 edge of an input"; radius table: "Status tags, checkboxes 4px" |
| checked, rest | `accent` fill, `on-accent` tick | "One accent … for primary actions, selection and focus only" |
| mixed, rest | `accent` fill, `on-accent` dash | as checked; a dash, so it isn't read as checked ("Colour alone never communicates state") |
| hover | unchecked: `surface-hover`; checked or mixed: `accent-hover` | "`accent-hover` … deepen the accent; `surface-hover` … deepen a neutral control" |
| pressed | unchecked: `surface-pressed`; checked or mixed: `accent-pressed` | "`accent-pressed`", "`surface-pressed`" |
| focus-visible | 2px heather outline, 2px off the box | "The focus ring shows on keyboard focus only" |
| disabled | unchecked: `surface` square, `disabled` edge; checked or mixed: `disabled` fill, no edge, `disabled` mark; no hover or pressed | "`disabled` and its text are a flat, quiet neutral"; "A disabled control keeps its intent's shape"; "natively disabled and leaves the tab order" |
| locked | its rest look, ticked or not, with no hover or pressed; still focusable | ADR 0013: while a footer action runs, the rows it acts on are the rows shown ticked, so the boxes keep showing them, as a pending Button keeps its rest colours; ticking does nothing, so nothing answers the pointer |

No pending: a checkbox starts no operation; selecting rows enters `rows-selected` through DataTable (ADR 0011). Locked is the pending of the action in DataTable's footer, seen from the boxes; DataTable's Pending story holds it as a style expectation.

## Token map

| Slot | When | Classes |
|---|---|---|
| `root` | always | `relative inline-flex aspect-square min-h-target items-center justify-center` |
| `input` | always | `peer absolute inset-0 appearance-none outline-none` (the box draws the ring) |
| `box` | always | `size-icon rounded-tag border transition-colors duration-fast ease-standard peer-focus-visible:focus-ring` |
| | unchecked | `border-control bg-surface` |
| | unchecked, enabled | `pointer-events-none relative before:absolute before:inset-0 before:rounded-tag before:transition-colors before:duration-fast before:ease-standard` |
| | unchecked, enabled, not locked | `peer-hover:before:bg-surface-hover peer-active:before:bg-surface-pressed`: the translucent hover lies over the `surface` fill (#250) |
| | checked or mixed | `border-transparent bg-accent` |
| | checked or mixed, enabled, not locked | `peer-hover:bg-accent-hover peer-active:bg-accent-pressed` |
| | unchecked, disabled | `border-disabled bg-surface` |
| | checked or mixed, disabled | `border-transparent bg-disabled` |
| `mark` | always | `pointer-events-none absolute size-icon` |
| | enabled | `text-on-accent` |
| | disabled | `text-disabled` |

A checked box's edge is transparent, so the fill runs to the corner and the box stays the same size: the tokens have no accent border role, and none is needed. The mark is stroked in `currentColor`, 2 units wide on a 16-unit box.

## A11y contract

- **Role**: `checkbox`, native; `"mixed"` sets the input's `indeterminate`, which assistive tech reads as mixed.
- **Accessible name**: `label`, as visually hidden text inside the `<label>`.
- **Keyboard**: Space toggles, native; Tab reaches it. Focus ring on `:focus-visible` only, drawn on the box, since the input has no look of its own.
- **Disabled**: native `disabled`, so it leaves the tab order and is announced unavailable.
- **Locked**: `aria-disabled="true"`, so it is announced unavailable but keeps its place in the tab order and focus doesn't drop while the action runs; a click or Space reports nothing, so the box keeps showing what `checked` says.
- **Busy**: none; it starts no operation.
- **Target size**: the input fills the root, a square of `min-h-target`: 24×24px admin (the WCAG 2.2 floor), 44×44px contractor (the 44px minimum). Asserted as a style expectation.

## Motion

| User action | Motion |
|---|---|
| hover, press | box fill colour, `transition-colors duration-fast ease-standard` ("`fast` 120ms (press, hover colour)") |
| toggles | fill and edge colour cross over at the same `fast` transition; the mark appears with the new state. Selection's `base` motion belongs to the row and to `rows-selected`, which DataTable owns (ADR 0011). |

No `settle`: selecting isn't a confirmed result. Reduced motion: the colour transition is already a `fast` crossfade and nothing moves, so it stays.

## Against defaults

The default version: shadcn's `Checkbox`, a Radix `Checkbox.Root` at `size-4` with `rounded-[4px]`, a `border-input` edge and `shadow-xs`, `data-[state=checked]:bg-primary` with a Lucide `CheckIcon` in the indicator, a 3px `ring` on focus-visible and `opacity-50` when disabled; the target is the 16px box.

How this one differs:

- **The target is the density's, not the box.** Brief: "Minimum target 24px | 44px"; "24px is a floor … targets still meet WCAG 2.2 target size". The box is drawn inside a target-sized input.
- **Box size follows density**: `size-icon`, 16px admin and 20px contractor, the brief's icon sizes, so the box sits with the row's icons.
- **No shadow.** Brief: "A shadow means 'this floats', never 'this is a box'."
- **Heather, not black.** The accent is for "selection and focus".
- **Disabled is a colour role, not opacity** (ADR 0002), keeping its shape: a checked box keeps a `disabled` fill.
- **Focus is an outline, offset, in the accent** (ADR 0002's `focus-ring`), not a 3px translucent ring.
- **Hover and pressed deepen the fill**; shadcn has none. Brief: state roles "deepen a neutral control".
- **Matches the default** in its 4px radius (the radius table says so), its tick and dash marks, and a 16px box at admin density; the brief is silent on the marks.
