# Notice: component plan

## Use

The result of an action on the Card that holds the action's Button ([ADR 0016](../../../docs/adr/0016-an-actions-result-on-a-card-is-a-notice-on-its-bottom-edge.md)). Put it in that Card's `result` slot, in the state the action enters, with the tone matching the outcome: `success` in the action's `to.success` state, `failure` in `to.failure`. It announces itself, so the state needs no live Text. A table's result, or one whose Card has left in the state the action enters, is a Toast.

## Anatomy

No Radix primitive: a Notice is a paragraph with a glyph, not a control and not a dialog.

- `root`: a `<div data-component="Notice" data-tone="…" tabIndex={-1}>`, the painted strip. Focusable from script only, so focus can land on it when the state that shows it removes the focused Button (ADR 0016), and it never joins the tab order.
- `icon`: a `<span>` one line of copy tall, so the glyph centres on the first line however many lines the copy wraps to. It holds the Phosphor glyph, `aria-hidden`: the copy says what happened.
- `text`: a `<p>` holding the copy.

Props: `text` (the result's copy, a UI spec literal, ADR 0004, as Text's and Toast's) and `tone` (`success` | `failure`, required: a failure that defaulted to success would read as done). No slots, no close button, no timer: it leaves only when a state change drops it.

Card draws the slot: the strip sits outside Card's padding, full width along its bottom edge, under a `line` hairline (Card's `result` slot, below). Notice paints the strip itself, so its bottom corners follow the Card's radius.

### Card's `result` slot

Card gains a fourth registry slot, `result`, allow-listed to Notice. To let the strip escape the padding, the padding moves one level in: the root keeps the frame (hairline border, radius, fill, width ceiling) and a `content` slot holds header, body and footer with the surface padding and the gap between them. It is always rendered, so a Card with no result looks exactly as it does today, and a Card that gains or loses a result keeps its header, body and footer elements (a footer Button keeps focus on a failure). The `result` slot renders only when given: a `border-t border-line` box under the content.

## Variants, sizes, states

- **`tone: success`**: the confirmed result. `surface-raised` with `ink` and `CheckCircle`, matching the success Toast. Not the `paid` green, which would read as one more status beside the Card's StatusTag (ADR 0016).
- **`tone: failure`**: the failed result. The inline error pair (`bg-error-inline` / `text-error-inline`, #359) with `WarningCircle`. Quieter than the Toast's `bg-error`, which is the loudest thing on a screen edge to edge (ADR 0016).
- **No size.** Density sets the type, side padding, icon and corners (ADR 0001).
- **Focus-visible**: the heather focus ring, for a keyboard user whose Button the result removed. It is the only state: the Notice isn't interactive, so it has no hover, pressed or disabled look.
- **Long copy wraps** within the strip, the glyph staying on the first line.
- **Tone change in place**: a retry that succeeds swaps the colours and glyph on the same element. The Card keeps its result, so nothing collapses and reopens.

## Token map

| Slot | Variant | Classes | Brief line behind it |
|---|---|---|---|
| `root` | all | `flex items-start gap-xs rounded-b-surface px-surface py-sm text-body focus-visible:focus-ring` | `px-surface` lines the copy up with the Card's content above it (20px admin, 24px contractor). `py-sm` (16px) as the prototype's variant C had it, so one line is a 52px strip at admin and 56px at contractor. `rounded-b-surface`: the radius table's surface radius, since the strip is the Card's own bottom edge (8px admin, 12px contractor); the 1px border makes the exact inner radius off the scale, so "the radius table wins". `gap-xs` between glyph and copy, as Toast's close button sits from its copy. Body text 14/16px. The focus ring is `:focus-visible` only, per the brief. |
| `root` | `success` | `bg-surface-raised text-ink` | "Surfaces get lighter as they rise"; the success Toast's pair. |
| `root` | `failure` | `bg-error-inline text-error-inline` | Colour roles: "a quieter `error-inline` pair for the same failure shown on a card (a failure notice)". AA-checked by the token build. |
| `icon` | all | `flex h-lh shrink-0 items-center` | One line of the copy tall, so the glyph centres on the first line. |
| glyph | all | `size-icon` | "Phosphor, regular weight: 16px on admin screens, 20px on contractor screens. An icon takes the colour of its control's label". |
| `text` | all | none | The copy, in the root's colour and type; `p` wraps `pretty` (src/styles.css). |

Card's added classes:

| Slot | Classes | Why |
|---|---|---|
| `root` | `flex max-w-card flex-col rounded-surface border border-line bg-surface` | The frame, as today, without the padding and gap. |
| `content` | `flex flex-col gap-md p-surface` | Today's padding and gap, one level in, so the result can sit outside it. |
| `result` | `border-t border-line` | "Under a `line` hairline" (ADR 0016). |
| `root`, holding a Notice | `vt-card-result` | The library-owned view transition name (below). |
| `root`, while its footer's Button is pending | `has-aria-busy:vt-card-result` | The old view of the change that brings the Notice in, so the Card is the same group on both sides. |
| `root`, the render after it lost its Notice | `vt-card-result closing-transition` | The new view of the change that takes it out, which runs at exit timing. |

## A11y contract

- **Role**: none. It is no live region of its own: each time its screen state is entered (it mounts, or a repeated failure re-enters the state), it hands its copy to Screen's one polite status region through `announce`, as Toast does. Never `role="alert"`: results stay polite (ADR 0013, ADR 0016).
- **Accessible name**: none needed; its copy is its content.
- **Keyboard and focus**: not in the tab order (`tabIndex={-1}`). When a screen-state change removes the focused element and nothing that takes focus takes over its view transition name, focus moves to the state's Notice before the Screen (ADR 0016 amending ADR 0011), so a keyboard user stays on the Card they acted on. A failure keeps the Button, which keeps focus.
- **Disabled, busy**: not applicable. While a retry is pending the Notice stays as it is; the Button is busy.
- **Contrast**: ink on `surface-raised`, the inline error ink on its tint; the token build and axe (gate 4) check both themes.
- **Target size**: not a target.

## Motion

The library owns it (ADR 0011, ADR 0016), in src/styles.css; the Notice itself animates nothing.

| What happens | Transition | Motion |
|---|---|---|
| Sends, and it's confirmed or fails: the Card gains a Notice | `confirm` / `fail` | The Card is the group `card-result` in both views: named by its pending Button in the old one and by its Notice in the new one. The group animates its height at `base`, `ease-settle` under `confirm` and `standard` under `fail`. Both images stay pinned to the top at their natural size and the group clips them, so the strip is uncovered as the Card grows. The old image holds still underneath and the new one fades in over it (`status-fade`, normal blending), so the header and body don't move or fade and a Button the new state drops is covered by the strip. Not the page's plus-lighter crossfade: its two views are timed apart (`base-exit` out, `base` in), which washes what both show toward white mid-way. |
| A retry succeeds | `confirm` | The strip's colours and glyph fade to the new tone in place, as Send reminder is covered. |
| A retry fails again | `fail` | The same image on both sides: nothing moves. |
| A state change drops the Notice and the Card stays | its own | The Card keeps the name for that state, with the `closing` class: the group shrinks, and the new image fades in, at `base-exit` with `exit`, covering the strip. |
| The Card leaves, or arrives already holding one | its own | Its image is alone: it fades out or in at the page's timing. |

Under reduced motion none of this applies: the group neither moves nor resizes, and the change is the `fast` crossfade every change is.

## Against defaults

The default is shadcn's `Alert`: a bordered rounded box with `p-4`, an icon at the top left (`absolute left-4 top-4`), an `AlertTitle` and `AlertDescription`, a `destructive` variant in red text, and `role="alert"`; or an MUI Alert with a coloured fill, an icon, a close button and `role="alert"`.

How this one differs:

- **A strip on the Card's edge, not a box inside it.** No border of its own and no radius at the top: the Card's frame is its frame (ADR 0016 rejected the box inside the padding, B).
- **Polite, not `role="alert"`.** It announces through Screen's one status region (ADR 0013).
- **No title and no close button.** One sentence or two of UI spec copy; it leaves only with a state change.
- **Success is the neutral raised surface, not green**, and failure the quieter inline pair, not the Toast's error fill.
- **Matches the default**, where the brief is silent: the glyph at the start of the copy, centred on its first line.
