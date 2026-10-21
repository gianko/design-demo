# Button: component plan

## Use

> A labelled action the user starts: `primary` for the one action a screen or bar exists for ("Approve and pay"), `secondary` for every other action beside it; reach for IconButton when there is no room for a label, and for a link when it only goes somewhere.

## Anatomy

- **root**: a native `<button type="button">`. No Radix primitive: a native button already has the role, the keyboard behaviour and the disabled semantics, and Radix has no Button part to wrap.
- **label**: the text, from the `label` prop (swapped for `pendingLabel` while pending). It is a text node of the root, not its own element, so there is one slot.
- No icon slot in P0 (see GAPS.md). No UI-spec child slots: a Button holds no other library node.

## Variants, sizes, states

| | Reason in the brief |
|---|---|
| `intent: primary` (default) | "One accent, heather … for primary actions, selection and focus only." The only Button that spends the accent. |
| `intent: secondary` | Everything that isn't the primary action must not compete for "what can I do here": neutral surface, `ink` label, `line` edge. |
| No size prop | ADR 0002: "Density is a CSS scope … components never know which density they're in." Height follows the density set through `min-h-target`. |
| No destructive / ghost / link variant | "Fewer is better"; the brief names no destructive action and bans status colours borrowing roles. Recorded as a gap. |
| `hover` | "`fast` 120ms (press, hover colour)". Secondary only; primary has no hover token (gap). |
| `focus-visible` | "The focus ring shows on keyboard focus only (`:focus-visible`), never on click." |
| `disabled` | "`opacity-*` is banned; disabled states use colour roles" (ADR 0002). |
| `pending` | "Never show success before it's confirmed." While an action runs, the label says what is happening ("Paying 3 invoices"), never the result, and the button can't be pressed twice. No spinner: "Banned: anything that loops." |

## Token map

Shared root: `inline-flex items-center justify-center whitespace-nowrap select-none rounded-control border px-sm py-2xs min-h-target min-w-target text-label transition-colors duration-fast ease-standard cursor-pointer focus-visible:focus-ring`

Resulting size: admin 36px tall (8 + 20 + 8), contractor 44px (the `min-h-target` floor).

| Slot · state | primary | secondary |
|---|---|---|
| root · rest | `bg-accent text-on-accent border-transparent` | `bg-surface text-ink border-line` |
| root · hover | (none: no accent-hover token) | `hover:bg-surface-raised` |
| root · focus-visible | `focus-ring` (2px `ring-focus`, 2px offset) | same |
| root · disabled | `disabled:bg-surface-raised disabled:text-ink-muted disabled:border-line disabled:cursor-not-allowed` | same |
| root · pending | `aria-busy:cursor-progress`, colours unchanged | same |
| radius | `rounded-control` (6px) | same |

## A11y contract

- **Role**: native `button`; `type="button"` so it never submits a form by accident.
- **Accessible name**: the visible label text. While pending, the name becomes `pendingLabel`.
- **Keyboard**: Tab focuses; Enter and Space activate (native).
- **Focus**: `:focus-visible` only, 2px `ring-focus` outline at 2px offset (3:1 against `page` is a build-time check in ADR 0005).
- **Disabled**: native `disabled`, out of the tab order; nothing explains why, so screens should prefer leaving an action enabled and explaining on press (gap).
- **Pending (busy)**: `aria-busy="true"` and `aria-disabled="true"`, *not* native `disabled`, so focus stays on the button the user just pressed; `onClick` is ignored while pending.
- **Target size**: admin 36px tall (floor 24px), contractor 44px (floor 44px), `min-w-target` for very short labels.

## Motion

- **Hover colour** (secondary): `transition-colors duration-fast ease-standard` (120ms). Out runs at the same duration; the brief's 70% exit rule is for elements leaving, not colour returning.
- **Press**: no motion; no pressed-colour token (gap).
- **Pending label swap**: instant. The system started it, so `settle` is off-limits, and the confirming motion belongs to the bar → toast hand-off, not the button.
- **Reduced motion**: the global `tokens.css` rule keeps colour transitions only, at `fast`; the Button has nothing else to remove.

## Against defaults

**The shadcn default**: `inline-flex h-9 px-4 rounded-md text-sm font-medium`, a near-black `bg-primary` fill with `hover:bg-primary/90`, six variants (default, destructive, outline, secondary, ghost, link) × four sizes, `disabled:opacity-50`, and a `focus-visible:ring-[3px]` halo.

- **Heather fill, not near-black**: "One accent, heather … for primary actions." Matches shadcn's "one filled button" idea; only the hue differs.
- **Two intents, not six**: "one accent keeps 'what can I do here' obvious"; every extra variant is a choice a generated screen can get wrong.
- **No size prop**: density is a CSS scope (ADR 0002); shadcn's `sm/default/lg` would let a screen pick 24px targets on a contractor phone.
- **Weight 600, not 500**: "weights 400 and 600 only", via the `label` type role.
- **6px radius by role**: matches shadcn's `rounded-md` in value; the brief sets it by role ("Buttons … 6px"), and nothing here is a pill.
- **Disabled by colour roles, not opacity**: ADR 0002 bans `opacity-*`; an opacity fade over a heather fill reads as a different colour, not as unavailable.
- **Busy without a spinner**: "Banned: anything that loops"; the label says what's happening instead.
- **No `→`, no caps, no icon by default**: banned template chrome (brief §Banned 12, 2).
- **Matches the default, brief silent**: `inline-flex` centred label, `whitespace-nowrap`, native `<button>`, 2px focus outline offset from the edge.
