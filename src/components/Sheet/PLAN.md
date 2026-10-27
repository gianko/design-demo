# Sheet: component plan

## Use

ADR 0011's line first, as written: "row detail; only in a DataTable's `detail` slot". The registry `use` adds what goes in it and when to reach for a sibling: a level 2 Heading bound to the row in `title`, the row's facts in `body` as Text, Amount, StatusTag and Stack; read-only, so no Button and no Card. It renders its own close button and closes on Escape. The facts of one thing on the screen itself, not behind a row, are a Card.

## Anatomy

Five `tv()` slots on plain elements, no Radix primitive. ADR 0006 names a Radix Dialog, but Radix isn't installed and a build session doesn't add dependencies; the native `<dialog>`, opened with `showModal()`, already gives what the Dialog would: the top layer, a backdrop for the scrim, the rest of the page inert, focus held inside, and Escape as a close request. A gap.

- `root`: the `<dialog>`, carrying `data-component="Sheet"`, the panel itself. Opened modally on mount, so the sheet is open whenever it is rendered: DataTable renders the opened row's Sheet and nothing for the others. It takes focus itself (`tabIndex={-1}`), so the first Tab reaches the close button and a screen reader starts at the sheet's name.
- `header`: a row holding the title and the close button.
- `title`: a box around the `title` slot's Heading, at least one control tall, so a one-line title centres on the close button and a long one wraps from the top beside it. Its id names the dialog (`aria-labelledby`).
- `close`: Sheet renders `<IconButton icon="close" label={closeLabel} />` here (spec: "Sheet renders its own close button").
- `body`: the `body` slot's children, one gap apart, scrolling on its own when the facts outrun the window.

Props:

- `closeLabel`: the close button's accessible name, such as "Close invoice details". Required, and a literal from the UI spec: every string a person meets is UI spec copy (ADR 0004), and IconButton's plan asks for a name that says what it closes, not a bare "Close".
- Slots: `title` (a ReactNode, allow-list Heading, as PageHeader's) and `body` (`children`, allow-list Heading, Text, Amount, StatusTag, Stack).

### The seam DataTable opens and closes it through

DataTable owns the open sheet (ADR 0011), so Sheet holds no open state. `sheet-host.tsx` exports:

- `SheetHost`: a context provider DataTable wraps around the opened row's `detail` node, carrying `onClose`. The close button and Escape both call it. With no host (Sheet's own stories), they do nothing.
- `transitionSheet(direction, origin, update)`: runs DataTable's open or close update inside a View Transition typed `sheet-open` or `sheet-close`, with the row's element as `origin`, so the row expands into the sheet and the sheet shrinks back into the row. It marks `origin` with `data-sheet-origin` for whichever snapshot shows the row, never both, so the shared name stays unique. Without View Transitions (jsdom) it runs the update directly.

Sheet returns focus itself: it remembers what had focus when it opened (the row, which a keyboard user opened with Enter) and focuses it again when it unmounts. That is what ADR 0006 asked of Radix's `onCloseAutoFocus`.

## Variants, sizes, states

No variant and no size: one sheet, one look; density sets its size (ADR 0002). Every choice a generated screen could get wrong is left out.

| State | How it shows | Brief line |
|---|---|---|
| open (the only rendered state) | an overlay panel at the end edge, full height, over the scrim | Elevation: "overlay (modal, sheet, menu: a deeper shadow and a scrim)" |
| closed | not rendered | DataTable renders only the opened row's Sheet (ADR 0011) |
| long title | wraps from the top, beside the close button | Type: titles balance (src/styles.css) |
| long body | the body scrolls; the title and close button stay | Quality floor: works at any length |
| phone | full width, still full height | "the contractor visits … often on a phone" |

The sheet itself isn't a control, so it has no hover, pressed or disabled. Its one control, the close button, is IconButton's: rest bare, hover `surface-hover`, pressed `surface-pressed`, focus-visible the heather ring. **In dark, `surface-hover` equals `surface-raised`** (both `oklch(0.27 0.025 330)`), so the close button's hover can't be seen on the sheet; pressed (`0.31`) and focus still show. That is IconButton's gap #250, which this build confirms in its dark hover shots; it isn't filed again. The overlay surface role that would sit above `surface-raised` is this build's own gap.

## Token map

| Slot | Classes | Brief line behind it |
|---|---|---|
| `root` | `ms-auto flex h-full max-h-none w-sheet max-w-full flex-col gap-lg rounded-s-surface bg-surface-raised p-surface text-ink shadow-overlay outline-hidden backdrop:bg-scrim` | `w-sheet` is the size token for this panel (420px). `ms-auto` pins it to the end edge (the UA centres a modal dialog; preflight already zeroes its margin, padding and border). `h-full max-h-none` makes it full height. `max-w-full` lets it fill a phone. `rounded-s-surface`: the surface radius (8px admin, 12px contractor) on the two corners that face the page; the edge against the window stays square. `bg-surface-raised`: "surfaces get lighter as they rise", and it is the highest surface the tokens have (a gap). `shadow-overlay` with no border: "a deeper shadow" (`edge-treatment`; dark's overlay shadow is itself a hairline ring). `backdrop:bg-scrim`: "`scrim` sits behind overlays". `p-surface` (20/24px), a surface's padding. `outline-hidden`: the panel takes focus only so the first Tab reaches the close button; it is never a keyboard stop of its own. |
| `header` | `flex items-start gap-sm` | One row; the button stays at the top when the title wraps. |
| `title` | `flex min-h-control grow items-center` | A one-line title centres on the control-height close button. |
| `body` | `flex min-h-0 flex-col gap-md overflow-y-auto` | Parts one gap apart, as Card's are; the body scrolls, not the panel. |

`Sheet.css`, beside the component, sets what no token class can: the view transition name and the sheet's timings (the ActionBar gap #236 pattern).

- `view-transition-name: row-detail` on the Sheet and on whichever row carries `data-sheet-origin`.
- Open at `slow` with `standard`; close at `slow-exit` with `exit` ("`slow` 320ms (sheet …)", "exits run at about 70%").

## A11y contract

- **Role**: `dialog`, native, modal (`showModal()`), so the page behind is inert and focus stays in the sheet.
- **Accessible name**: the title, through `aria-labelledby` on the title box's id.
- **Keyboard**: Escape closes (the dialog's `cancel`, which Sheet takes over so DataTable closes it through its View Transition); Tab reaches the close button, Enter or Space presses it. Opening it is DataTable's (Enter on a row).
- **Focus**: on open the dialog takes focus; on close focus returns to whatever had it when the sheet opened (the row). The focus ring shows on the close button on `:focus-visible` only.
- **Disabled, busy**: none; the sheet starts no operation and is read-only.
- **Target size**: the close button is a square of `h-control`, 32px admin and 44px contractor ("every target on my screens, the sheet's close button included, to be at least 44px").

## Motion

| User action | Transition | Motion |
|---|---|---|
| Clicks a row, or presses Enter on it | `sheet-open`, run by `transitionSheet` | The `row-detail` group morphs from the row's box to the sheet's at `slow`, `standard`; the row's image fades out at `slow-exit`, `exit`, and the sheet's fades in at `slow`. The scrim fades in with the page's crossfade. |
| Presses Escape or the close button | `sheet-close` | The group morphs back from the sheet to the row at `slow-exit`, `exit`. |

No `settle`: opening a sheet confirms nothing ("settle … only for confirming something the user did"). No keyframes of its own, so nothing animates on page load: a story renders the sheet already open, still. Reduced motion: src/styles.css already turns every View Transition into a `fast` crossfade with no movement; Sheet.css's timings apply only under `prefers-reduced-motion: no-preference`.

## Against defaults

The default is shadcn's `Sheet` (Radix Dialog): `fixed inset-y-0 right-0 h-full w-3/4 sm:max-w-sm`, `bg-background`, a left `border-l`, `shadow-lg`, `p-6`, a slide-in from the right over `bg-black/50`, a `SheetHeader` with `SheetTitle` and `SheetDescription`, a 16px Lucide `X` in an absolutely positioned corner button with `opacity-70`, and a `SheetFooter` of action buttons.

How this one differs:

- **It expands from the row, not slides in from the edge.** Signature transition: "a row expands into the invoice-detail sheet".
- **Raised surface and an overlay shadow, no border.** "A shadow means this floats"; one edge treatment (`edge-treatment`).
- **Rounded on the corners that face the page, at the surface radius.** "One radius everywhere is a default, not a choice."
- **A plum-tinted scrim, not black at 50%.** "Every neutral is tinted toward plum."
- **Read-only: no footer, no actions, no description slot.** Spec: "Sheet is read-only"; row-scoped actions are out of P1.
- **The close button is in the header row, at the control height**, not a small absolutely placed `X`; 44px on contractor screens.
- **The width is a token, `w-sheet`,** not a fraction of the screen.
- **Matches the default**, where the brief is silent: the end edge, full height, a modal dialog with Escape and a close button.
