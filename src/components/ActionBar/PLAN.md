# ActionBar: component plan

## Use

ADR 0011's line, as written: "the bulk-action bar; put the action's Button here, show it `when: [rows-selected]`, and leave it out of the success state so it becomes that state's Toast". The registry `use` adds when to reach for a sibling instead: an action on one thing goes in that Card's footer, and a screen's own action in PageHeader's `actions`.

## Anatomy

One `tv()` slot, `root`, a `<div>` carrying `data-component="ActionBar"`.

- `root`: the raised bar. A flex row as wide as its Buttons, at the end of its container, as Stack's `justify="end"` places actions.
- The `body` registry slot is `children`, allow-listed to **Button**. ADR 0011: the bar "holds the action's Button". Gate 1's `action-bar-button` already fails a Button in the bar that runs no action.

No Radix primitive. A bulk-action bar isn't a dialog, menu or toolbar widget: it holds one or two buttons, reached in tab order after the table they act on. `role="toolbar"` would promise arrow-key roving focus between its buttons, and the bar has nothing to rove.

No props besides the slot. Whether the bar shows is the UI spec's `when` (ADR 0004), not a prop.

## Variants, sizes, states

- **No variants.** The brief names one bulk-action bar, raised. Every variant would be a choice a generated screen can get wrong.
- **No size.** Density sets the Button's height and padding (ADR 0001). The bar's own padding is one step, so its height follows the Button's.
- **The bar's states are the screen's and its Button's.** The bar isn't interactive: hover, pressed, focus-visible and disabled are its Button's, and the gate's hover, pressed and focus shots are of that Button.
  - **Shown**: a screen state its `when` names, `rows-selected` by ADR 0011.
  - **Pending**: its Button is pending while the action runs ("pay → the bar shows pending"). It's the Button's progress edge, so the bar itself doesn't change. A story of its own, tagged `animates-while-idle`, so the sweep is baselined inside the bar.
  - **After `fail`**: the bar stays and the rows stay selected (ADR 0011), so the bar looks as it did at rest with its Button back at rest. That's a screen-state behaviour, tested in `ActionBar.test.tsx`, not a separate look.
  - **After `confirm`**: the success state doesn't show the bar; it hands off to that state's Toast through the shared view transition name.

## Token map

| Slot | Classes | Brief line behind it |
|---|---|---|
| `root` | `sticky bottom-sm z-raised ms-auto flex w-fit flex-wrap items-center justify-end gap-xs rounded-surface bg-surface-raised p-2xs shadow-raised` | `ms-auto w-fit`: it hugs its Buttons at the end edge, where Stack puts a row's actions, so it ends where the table above it ends and spreads no empty surface across the table's width (the screenshot critique's one cut). Elevation: "raised (sticky and floating bars, toasts: one soft plum-tinted shadow)" sets `shadow-raised`, `bg-surface-raised` ("surfaces get lighter as they rise") and `z-raised`. `sticky bottom-sm` keeps it next to the table it acts on when the table is short, and floating 16px above the window's bottom edge when it's long (user story 8: "the bulk action is next to what it acts on"). Radius table: surfaces 8px admin, 12px contractor (`rounded-surface`). No border: `edge-treatment` fails a slot with both a border and a shadow, and dark's `shadow-raised` is itself a hairline ring. `p-2xs` (8px) makes the bar one control plus 16px: 48px admin, 60px contractor, the contractor's row height. `gap-xs` (12px) between buttons, as in a Card footer row. `flex-wrap` so two buttons on a phone wrap rather than spill. |

One more property comes from `ActionBar.css`, beside the component: `view-transition-name: action-result` on the root, the name Toast will share (ADR 0011). There's no token class for a view transition name, and arbitrary properties fail token lint, so the file sets it with an attribute selector. A gap.

## A11y contract

- **Role**: none, a plain `<div>`. Its Buttons carry their own names and states. Not a landmark: one bar with one button doesn't earn a region in the landmark list, and naming it would need copy the UI spec doesn't give.
- **Accessible name**: none needed. The Button's label says what happens to the selection ("Approve and pay").
- **Keyboard and focus**: not focusable. Its Buttons come in source order, after the table, so ticking rows and then tabbing reaches the action. Focus shows on `:focus-visible` only, the Button's own ring, which `p-2xs` leaves room for inside the bar.
- **Disabled, busy**: the Button's. A pending Button stays focusable, marked `aria-busy` and `aria-disabled`, so focus doesn't drop while the payment runs. The Toast announces the result, not the bar.
- **Target size**: the Button's: 32px admin, 44px contractor. Two buttons sit 12px apart, so the 24px admin spacing rule holds.
- **Contrast**: the Button's colours sit on `surface-raised`. axe (gate 4) checks the pair in both themes.

## Motion

The library owns all of it (ADR 0011); the bar sets only its view transition name, and `src/styles.css` times every group.

| User action | Transition | Motion |
|---|---|---|
| Ticks the first row | `rows-selected` entered, untyped | The bar's own group is new-only, so it fades in at `base`, `standard`. |
| Unticks the last row | default entered, untyped | The bar fades out at `base-exit`, `exit`. |
| Pays, and it's confirmed | `to.success` entered, `confirm` | The bar's group morphs into the Toast that shares its name, at `base` with `ease-settle`: one overshoot, confirming what the user did. |
| Pays, and it fails | `to.failure` entered, `fail` | The bar is in both views, unchanged, so nothing moves. Its Button returns to rest in the same update. |
| Waits on the payment | none | The Button's progress edge fills over `slow`, then sweeps. |

Reduced motion: `src/styles.css` stops every group's animation and makes each change a `fast` crossfade; the Button's sweep becomes a static edge. Nothing moves.

No entrance keyframe of its own: the bar fades in but doesn't rise. Keyframes live in `tokens/keyframes.css`, which a build session doesn't edit. A gap.

## Against defaults

The default is shadcn's community "floating action bar" or a data-table toolbar: a `fixed bottom-4 left-1/2 -translate-x-1/2` pill (`rounded-full`) in a dark inverted fill with `shadow-lg`, a "3 selected" count and an × to clear, sliding up with `animate-in slide-in-from-bottom` on every appearance.

How this one differs:

- **Sticky in the flow, not fixed to the window's centre.** It sits under the table it acts on and floats only once the table runs past the fold (user story 8). Elevation: "raised (sticky and floating bars …)".
- **Surface radius, never a pill.** Radius table; banned: "pill-shaped buttons, tags or chips".
- **A raised surface in the theme's own roles, not an inverted dark slab.** Colour is assigned by role, and in dark mode "levels are lighter surfaces".
- **One soft plum-tinted shadow, no border.** Elevation; `edge-treatment`.
- **No slide-up animation of its own.** The bar answers the screen-state change; its motion is the library's View Transition, and its signature moment is the hand-off to the Toast, not its own entrance. Banned: "fade-and-slide-up entrances".
- **No count and no clear button.** Copy is the UI spec's (ADR 0004), and the library has no count copy to give. Clearing isn't an action. A gap for the count.
- **At the end edge, not centred.** It ends where the table ends, under the column a row's actions would sit in, so it reads as part of the table rather than as page chrome.
- **Matches the default**, where the brief is silent: a compact horizontal bar of actions, appearing only while rows are selected.
