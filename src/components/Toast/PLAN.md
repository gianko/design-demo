# Toast: component plan

## Use

ADR 0011's line, as written: "the live result of an action; only in a state an action enters". The registry `use` adds where it goes, how it leaves and when to reach for a sibling: last in the Screen, in the state its action enters, tone `success` in the action's `to.success` state and tone `failure` in `to.failure` (ADR 0013). It is fixed to the window's bottom end corner, so where it sits in the tree moves nothing; it renders its own close button; a success Toast dismisses itself after a few seconds and a failure Toast stays until closed. One per state. Copy that stays on the screen whatever happened is a Text.

## Anatomy

Three `tv()` slots on plain elements, no Radix primitive, and the internal IconButton.

- `corner`: a `<div>` fixed along the window's bottom, inset by the density's page padding, stacked at `z-toast`. It lets the pointer through, so only the toast takes it. It isn't in the page flow, so a Toast placed last in the Screen moves nothing (ADR 0013).
- `root`: a `<div data-component="Toast" data-tone="…">`, the raised surface, at the corner's end edge. The measure wide, or the corner's whole width where that is narrower, as on a phone.
- `text`: a `<p>` holding the copy, at least one control tall, so one line centres on the close button and a long one wraps from the top beside it.
- The close button: `<IconButton icon="close" label={closeLabel} />` at the end, as Sheet renders its own.

Props: `text` (the result copy, a literal from the UI spec, ADR 0004), `tone` (`success` | `failure`, required: a failure toast that defaulted to success would settle and dismiss itself like a confirmed payment) and `closeLabel` (the close button's accessible name, such as "Close payment result"; required and a UI spec literal, as Sheet's is). No slots: a toast holds one sentence or two, never a Button (a toast that asks for an action is a dialog, and a retry is the footer's Button, which stays).

No Radix Toast: it brings its own live region, a viewport, a stack and swipe-to-dismiss. ADR 0011 makes Toast its state's announcement through Screen's `announce`, and ADR 0013 shows one at a time, so only the timer and the close button would have been used, and those are a few lines here.

### Whether it shows

The library's own state, like the open Sheet (ADR 0013), not a screen state: the screen stays in its state (such as `payment-scheduled`) after the toast leaves, and the UI spec names none of this.

- Toast keeps the screen-state entry it was dismissed in (`useStateEntry`). It shows unless that is the current entry, so each time its state is entered, a retry that fails again included, it shows again, even after it was closed or timed out.
- The close button dismisses either tone. A success toast also dismisses itself after the `toast` duration token (5s), which the Toast reads from its custom property, `--ds-motion-duration-toast`. Its timer pauses while the pointer is over the toast, while focus is within it and while the tab is hidden, and resumes where it left off. A failure toast has no timer.
- Each entry renders a fresh toast (keyed by the entry), so its timer starts from the full duration and no hover or focus carries over from the last one.
- One at a time: a state shows at most one Toast (gate 1), so a new result, a state entered, replaces the current one.
- A Toast in the state its host starts in (entry 0) is a still render of that state, as a state story, a gate render and a Figma capture show it: its timer holds until the state is next entered. So captures are deterministic without a test attribute (a gap).
- Dismissing runs through a View Transition, so the toast slides out. If focus was on its close button, it lands on the Screen, by the same rule as a state change that removes the focused element (`keepingFocus`, ADR 0011).

## Variants, sizes, states

- **`tone: success`**: the confirmed result. The raised surface and ink. The motion is the loud part (brief: "motion is the one loud thing").
- **`tone: failure`**: the failed result. The error pair (`bg-error text-error`, #241), told apart at a glance; the copy still says what happened and what to do next, so colour never carries it alone.
- **No size.** Density sets the type, padding, radius, inset and width (ADR 0001).
- **The surface is not interactive**: no hover, pressed or focus look of its own, and no `tabIndex`. Its one control, the close button, is IconButton's: bare at rest, `surface-hover` and `surface-pressed` (translucent ink, so they show on either tone), the heather focus ring.
- **Long copy wraps** within the measure, the toast growing taller and its close button staying at the top.
- **Phone**: the toast spans the window within the page padding, at the bottom.

## Token map

| Slot | Variant | Classes | Brief line behind it |
|---|---|---|---|
| `corner` | all | `pointer-events-none fixed inset-x-0 bottom-0 z-toast flex px-page pb-page` | ADR 0013: "fixed to the window's bottom end corner, inset by the density's page padding and above page content at `z-toast`". The inset is padding on a strip, not offsets on the toast, because `page` is a padding token and no inset utility takes it. |
| `root` | all | `pointer-events-auto ms-auto flex w-full max-w-measure items-start gap-xs rounded-surface py-2xs ps-surface pe-2xs shadow-raised vt-toast` | Elevation: "raised (sticky and floating bars, toasts: one soft plum-tinted shadow)" sets `shadow-raised`. `ms-auto w-full max-w-measure`: the measure wide at the end edge on a wide window, the strip's width on a phone ("on a phone it spans the width within the page padding"), with no breakpoint. Radius table: surfaces 8px admin, 12px contractor. `ps-surface` (20/24px), a surface's padding, before the copy; `pe-2xs` and `py-2xs` around the control-height close button, so a one-line toast is 48px admin and 60px contractor. No border: `edge-treatment`, and dark's `shadow-raised` is itself a hairline ring. |
| `root` | `success` | `bg-surface-raised text-ink` | "Surfaces get lighter as they rise". |
| `root` | `failure` | `bg-error text-error` | The error pair, AA-checked by the token build (#241). |
| `text` | all | `flex min-h-control grow items-center text-body` | Body text 14px admin, 16px contractor. `p` already wraps `pretty` (src/styles.css). |

src/styles.css sets what no token class can, with the library's other view transitions (ADR 0006): `vt-toast`, the utility setting `view-transition-name: toast`, on either tone and nothing else, and the slide (below). The `tv()` config lives in `toast.ts`, which the registry entry reads, so the generator loads the entry under tsx on node without React.

## A11y contract

- **Role**: none on the toast. It is its state's announcement through Screen's one polite `role="status"` region (spec § Component pieces 3, ADR 0011): each time its screen state is entered, a retry that fails again included, it calls `announce(text)`, as a live Text does. A toast with its own region would mount with its copy already in it, which some screen-reader and browser pairs don't announce (Text's gaps, #98). A failure is announced politely too: Screen has one region, and the user is waiting on the result of their own action (ADR 0013).
- **Accessible name**: the close button's, `closeLabel`, which says what it closes. The toast itself needs none.
- **Keyboard and focus**: the toast takes no focus itself; its close button is in the tab order, last in the Screen as the toast is. Focus within pauses a success toast's timer, so a keyboard user who reaches it isn't left with nothing. A confirmed payment's focus goes to the table, not the toast (ADR 0013), so the timer isn't held by focus the user didn't put there. Closing with the keyboard moves focus to the Screen.
- **Timing**: WCAG 2.2.1 asks that time limits can be paused or turned off. The copy stays in the status region's history, the result stays on the screen in the flipped statuses, hover and focus pause the timer, and a failure, which the user has to act on, never leaves on its own (ADR 0013, Consequences).
- **Contrast**: ink on `surface-raised`, error ink on the error tint; axe (gate 4) checks both in both themes.
- **Target size**: the close button is control-height square, 44px on contractor screens.

## Motion

The library owns it (ADR 0011, ADR 0013). src/styles.css, inside `prefers-reduced-motion: no-preference`:

| What happens | Transition | Motion |
|---|---|---|
| Pays, and it's confirmed | `to.success`, `confirm` | The toast's image is the new view's alone (`::view-transition-new(toast):only-child`): it slides in from the end edge (`slide-in`) at `slow` with `ease-settle`, the one overshoot, during the same transition that flips the statuses in the stagger. |
| Pays, and it fails | `to.failure`, `fail` | It slides in at `slow` with `standard`: `fail` never settles. |
| Closes it, or a success times out | an untyped View Transition | Its image is the old view's alone: it slides back out past the end edge (`slide-out`) at `slow-exit` with `exit`. |
| Leaves its state for one without a toast | that state's transition | It slides out the same way. |
| A retry is confirmed after a failure, or fails again | `confirm` or `fail` | A toast in both views: it changes in place (the group's own morph and crossfade), sliding nowhere. |

No fade and no scale. `slide-in` and `slide-out` are the Sheet's keyframes (#292), shared: they translate along `--end-edge` by the image's own width plus `--slide-past`, which is nothing for a sheet flush with the window's edge and `2xl` (40px) for a toast, a step wider than either density's page padding (28px, 36px). The pseudo-elements hang off the root, outside the Screen's density scope, so they can't read the toast's own inset (a gap). Under reduced motion none of this applies: a toast entering or leaving is the `fast` crossfade every change is, with no movement.

## Against defaults

The default is shadcn's Sonner or Radix Toast: a `fixed bottom-4 right-4` stack of white cards about 356px wide with a border and `shadow-lg`, an icon per type (green check, red cross), a title and description, a close ×, an optional action button, a 4–5s timer paused on hover, swipe to dismiss, and a slide-in from the edge.

How this one differs, now that the bar it used to become is gone (ADR 0013):

- **Closer to Sonner on position and slide.** Fixed to the bottom end corner, a fixed width (the measure), sliding in from the end edge and back out, with a timer that pauses on hover. The inset is the density's page padding, so the toast lines up with the page's own edge rather than 16px.
- **No stack and no swipe.** One toast at a time, the result of the last action; a new one replaces it. Swipe would be a second way to do what the close button does.
- **The timer pauses on focus within and a hidden tab too, and only a success has one.** A failure has to be read and acted on, so it stays.
- **One sentence or two of copy, no title, no icon, no action.** Copy is the UI spec's literal (ADR 0004); a retry is the footer's Button. The copy says what happened, so the tone needs no icon.
- **Raised, not bordered.** "A shadow means this floats"; one soft plum-tinted shadow, no border (`edge-treatment`).
- **Success is the neutral raised surface, not green.** The statuses in the table flip to Scheduled (blue) as the toast arrives; a green toast beside them would read as a different status.
- **Failure is a red tint, not a solid red slab.**
- **Settles only when confirming.** A success slides in with the one overshoot, under `confirm`; a failure doesn't.
