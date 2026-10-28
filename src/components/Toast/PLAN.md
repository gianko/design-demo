# Toast: component plan

## Use

ADR 0011's line, as written: "the live result of an action; only in a state an action enters". The registry `use` adds where it goes and when to reach for a sibling: last in the Screen, in the state its action enters, tone `success` in the action's `to.success` state and tone `failure` in `to.failure` (ADR 0013). One per state. Copy that stays on the screen whatever happened is a Text.

ADR 0013 retired the bulk-action bar this plan was first written against, and moved the action's Button into DataTable's footer. Until the Toast's placement, motion and lifetime are redone to that ADR, the Toast keeps its look, and the sections below still describe the bar it used to share a place and a view transition name with.

## Anatomy

Two `tv()` slots on plain elements, no Radix primitive.

- `root`: a `<div data-component="Toast" data-tone="…">`, the raised surface. Sticky in the flow at the end edge, as the bar is, so it lands where the bar was.
- `text`: a `<p>` holding the copy, at least one control tall, so a one-line toast is exactly the bar's height and the morph changes only width and content.

Props: `text` (the result copy, a literal from the UI spec, ADR 0004) and `tone` (`success` | `failure`, required: a failure toast that defaulted to success would settle and morph like a confirmed payment). No slots: a toast holds one sentence or two, never a Button (a toast that asks for an action is a dialog, and a retry is the bar's Button, which stays).

No Radix Toast: it brings its own live region, a viewport, timers and swipe-to-dismiss. ADR 0011 makes Toast its state's announcement through Screen's `announce`, and its lifetime is its screen state's, so none of that applies.

## Variants, sizes, states

- **`tone: success`**: the confirmed result (ADR 0011: "shows in the action's `to.success` state"). The bar's own raised surface and ink, so the bar becoming the toast reads as one object changing what it says. The motion is the loud part (brief: "motion is the one loud thing").
- **`tone: failure`**: the failed result, beside the bar. The overdue pair (`bg-overdue text-overdue`), the gentlest red the tokens have, so it's told apart at a glance from the neutral bar next to it; the copy still says what happened and what to do next, so colour never carries it alone. Not the solid `failed` fill: a slab of solid red would shout over the screen, and the brief keeps loudness for motion. No error surface role exists: a gap.
- **No size.** Density sets the type, padding and radius (ADR 0001).
- **Not interactive**, so no hover, pressed, focus-visible, disabled or pending. It has no dismiss: it shows for as long as the screen is in its state (a gap).
- **Long copy wraps** within the density's measure, and the toast grows taller; a phone story checks it stays inside the screen.

## Token map

| Slot | Variant | Classes | Brief line behind it |
|---|---|---|---|
| `root` | all | `sticky bottom-sm z-toast ms-auto flex w-fit max-w-measure items-center rounded-surface px-surface py-2xs shadow-raised` | Elevation: "raised (sticky and floating bars, toasts: one soft plum-tinted shadow)" sets `shadow-raised`; `z-toast` is the toast layer. `sticky bottom-sm ms-auto w-fit` are the bar's placement, so the toast lands where the bar was and floats above the window's edge just as the bar did (signature transition: "the bar becomes the toast"). Radius table: surfaces 8px admin, 12px contractor. `px-surface` (20/24px), a surface's padding, puts the copy where the bar's Button label sat (8px + the control's 12/16px). `py-2xs` with `text`'s `min-h-control` makes a one-line toast 48px admin and 60px contractor, the bar's height. `max-w-measure` keeps a long failure to about 65 characters a line. No border: `edge-treatment`, and dark's `shadow-raised` is itself a hairline ring. |
| `root` | `success` | `bg-surface-raised text-ink` | "Surfaces get lighter as they rise"; the bar's surface, so the hand-off is seamless. |
| `root` | `failure` | `bg-overdue text-overdue` | Status colours: Overdue is red, Failed is solid red; the tint keeps it assured rather than alarmed. The pair is AA by construction. A gap. |
| `text` | all | `flex min-h-control items-center text-body` | Body text 14px admin, 16px contractor. `p` already wraps `pretty` (src/styles.css), so a two-line failure doesn't strand a word. |

`Toast.css`, beside the component, sets what no token class can: the view transition names, and the toast's entering duration. `Toast.tsx` imports it, as the bar and Sheet import theirs. The `tv()` config lives in `toast.ts`, which the registry entry reads, so the generator loads the entry under tsx on node without touching the stylesheet.

- `view-transition-name: action-result` on a success Toast: the bar's name (the bar's stylesheet), so entering the success state morphs the bar into the toast. Repeated here, not imported, so each component's folder owns its rule; a style expectation in the pairing stories asserts the two computed names match. A gap, as for the bar (#236).
- `view-transition-name: action-failure` on a failure Toast: a name of its own, since the bar it sits beside keeps `action-result` and a name must be unique in a snapshot. Its own group enters on its own.
- Entering at `slow` (below).

## A11y contract

- **Role**: none on the toast. It is its state's announcement through Screen's one polite `role="status"` region (spec § Component pieces 3, ADR 0011): each time its screen state is entered, a retry that fails again included, it calls `announce(text)`, as a live Text does. A toast with its own region would mount with its copy already in it, which some screen-reader and browser pairs don't announce (Text's gaps, #98). Failure is announced politely too: Screen has one region, and a failed payment isn't an emergency that should cut the reader off.
- **Accessible name**: none needed; it isn't a control. Its copy is plain text in the page, after the table, so a screen-reader user reading on finds it there too.
- **Keyboard and focus**: not focusable. Focus stays on the Button that ran the action (pending keeps it focusable). On success that Button leaves with the bar: a gap shared with the generated screens, not the toast's to fill.
- **Contrast**: ink on `surface-raised`, overdue ink on overdue tint; axe (gate 4) checks both in both themes.
- **Target size**: nothing to target.

## Motion

The library owns it (ADR 0011). src/styles.css times every group at `base`; Toast.css times the toast's own entrance at `slow`, the brief's duration for "toast entering", only when motion is allowed. Reduced motion leaves styles.css's `fast` crossfade untouched.

| User action | Transition | Motion |
|---|---|---|
| Pays, and it's confirmed | `to.success`, `confirm` | The `action-result` group morphs from the bar to the toast, size and place, at `slow` with `ease-settle`: one overshoot, confirming what the user did. The bar's image fades out at `slow-exit`, `exit`; the toast's fades in at `slow`, `settle`. |
| Pays, and it fails | `to.failure`, `fail` | The bar is in both views, unchanged. The failure toast's own `action-failure` group is new-only: it fades in at `slow`, `standard`, no settle (`fail` never settles). |
| Retries, and it fails again | `to.failure` re-entered, `fail` | The toast is in both views, so nothing moves; it announces again. |
| Retries, and it's confirmed | `to.success`, `confirm` | The bar morphs into the success toast as above; the failure toast leaves at `slow-exit`, `exit`. |

No entrance movement of its own: the toast doesn't rise or scale in when no bar precedes it. Keyframes live in `tokens/keyframes.css`, which a build session doesn't edit; the bar's gap #237 asks the same question, so it isn't filed again.

## Against defaults

The default is shadcn's Sonner or Radix Toast: a `fixed bottom-4 right-4` stack of white cards with a border and `shadow-lg`, an icon per type (green check, red cross), a title and description, a close ×, an optional action button, a 4–5s timer, swipe to dismiss, and a slide-in from the edge.

How this one differs:

- **Sticky in the flow where the bar was, not fixed to the window's corner.** The signature transition is the bar becoming the toast, so the toast takes the bar's place (brief: "the bar becomes the toast").
- **Lives as long as its screen state.** No timer, no ×, no swipe: a toast that vanishes on a timer is a state change the system starts, and generated screens hold no state (ADR 0011). A gap.
- **One sentence or two of copy, no title, no icon, no action.** Copy is the UI spec's literal (ADR 0004); a retry is the bar's Button. Phosphor joins with IconButton later, and the copy says what happened, so the tone needs no icon to be understood.
- **Raised, not bordered.** "A shadow means this floats"; one soft plum-tinted shadow, no border (`edge-treatment`).
- **Success is the neutral raised surface, not green.** The statuses in the table flip to Scheduled (blue) as the toast arrives; a green toast beside them would read as a different status.
- **Failure is a red tint, not a solid red slab.**
- **No slide-in.** It arrives by the View Transition's morph or fade, at `slow`, settling only under `confirm`.
- **Matches the default**, where the brief is silent: a compact raised surface at the end edge, near the bottom of the window.
