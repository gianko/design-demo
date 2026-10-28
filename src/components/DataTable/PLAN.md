# DataTable: component plan

## Use

The screen's list of invoices or payments, one row per item: bind `rows` to a fixtures list, name each column in `columns`, and put one node per column in `cell`, in the same order, its props bound to `row.*`. When an action acts on the Selection, put its Button in `actions`, the table's footer, and give `selectionText`; only a table with actions is selectable, so then each row has a checkbox, and selecting rows enters `rows-selected` (until #298 retires it). To let a row open its details, put one Sheet in `detail`, its children bound to `row.*`: clicking a row or pressing Enter on it opens that row's Sheet. A table can have actions and a `detail` Sheet at once. For the facts of one invoice shown on the screen itself use a Card; for a fixed set of named things use Cards in a Stack.

## Anatomy

No Radix primitive: Radix isn't installed, and a native `<table>` already has the roles a screen reader navigates by (table, row, column header, cell). Selection is Checkbox, which DataTable renders; the UI spec never names it (spec § Eval screen briefs).

- `root`: a `<div>`, carrying `data-component="DataTable"`. The frame, a flat surface: `line` hairline, the density's surface radius. It scrolls sideways if the columns outgrow a narrow screen, so it clips the table's corners too. It holds the `body`, then, in a table with actions, the `footer`.
- `body`: a `<div>` around the table (#296). It grows with the rows up to the header row and 10 rows at the density's row height (`max-h-table`: 506px admin, 660px contractor), and scrolls down past that. It is as wide as the table, and at least the frame, so it never scrolls sideways itself: the frame does, as before the cap.
- `table`: the `<table>`, full width. In a table with actions it takes focus from script only (`tabIndex={-1}`), where focus goes when the footer Button that had it is disabled (A11y contract).
- `footer` (#297, ADR 0013): a `<div>` after the body, in a table with actions while it has rows: inside the frame, outside the body's scroll, so under a capped body the count and the Buttons stay in view. It is stuck to the frame's start edge (`sticky start-0`) and the frame's width, so when a wide table scrolls sideways on a phone the footer stays put rather than scrolling away with the columns.
- `count`: a `<p>` at the footer's start edge, the selected count.
- `buttons`: a `<div>` at the footer's end edge, holding the `actions` slot's Buttons.
- `headerRow`: the `<tr>` in `<thead>`. In a table of more than 10 rows it is stuck to the top of the body as it scrolls down, and moves sideways with its columns.
- `header`: each `<th scope="col">`, the column's name.
- `row`: each `<tr>` in `<tbody>`, one per item in `rows`.
- `cell`: each `<td>`, holding one node of the `cell` slot for that row.
- `select`: in a table with actions, the first `<th>`/`<td>` of a row, holding its Checkbox; the header's selects every row.

Props and slots:

- `rows`: the items, bound to a fixtures list (`invoices`). Each has an `id`, which keys the row and is what selection holds.
- `columns`: each column's header, in the order of the `cell` slot's nodes.
- `selectionText` (#297): the selected count's three forms, `{ none, one, other }`, each literal UI spec copy (`"No invoices selected"`, `"1 invoice selected"`, `"{count} invoices selected"`). The footer shows `none` with no row ticked, `one` with one, and `other` otherwise, with `{count}` replaced by the number of ticked rows: the UI spec gives the words and the library only the number (ADR 0013, amending ADR 0004). Optional in the registry, since a table without actions has no count; gate 1 requires it on a table with actions (`selection-text`) and a `{count}` in its `other` form (`selection-count`).
- `actions` slot (#297): the footer's Buttons, allow-listed to Button, each running an action (gate 1's `table-action-button`). In code a `ReactNode`, one Button or a fragment of them. A table is selectable exactly when it has actions: each row and the header get a Checkbox and the table reads and writes the Selection; a table without actions has no checkboxes and no footer, no row fills with `selected`, and the table never enters `rows-selected` (#203). The `selectable` prop this replaces is gone. DataTable renders each Button disabled while no row is ticked, and reads a Button's `pending` to lock the selection while its action runs, so the screen holds no state for either (ADR 0011).
- No `selected` prop: a fixture variant names its starting selection, and the host starts with it (GAPS.md).
- `cell` slot: one template node per column, rendered once per row with that row's `row.*` bindings (ADR 0004). In code it is a function from the row to those nodes, `cell={(row) => <>…</>}`: a `ReactNode` can't read a row.
- `detail` slot (#214): one Sheet, allow-listed, rendered for the opened row with that row's `row.*` bindings (ADR 0011), and in code a function of the row like `cell`, `detail={(row) => <Sheet …>}`. DataTable holds which row is open, not the screen state, and renders that row's Sheet inside a `SheetHost` (`Sheet/sheet-host.tsx`) after its surface. The Sheet draws in the top layer, so `nested-cards` reads it as a surface of its own wherever it sits in the DOM (#254).

## Variants, sizes, states

No look variant and no size: one table, density sets its size (ADR 0002). Selection was always on in P0 (spec § Library widening 3: "selectable rows only"); P1 made it a `selectable` prop (#203), and ADR 0013 ties it to the `actions` footer, so a table nothing acts on isn't cluttered with checkboxes that do nothing. The selection and footer states below are a table with actions'.

| State | How it shows | Brief line |
|---|---|---|
| rest | `surface` table on a `line` hairline, `line` rules between rows, 12px `ink-muted` headers, rows at the density's row height | "Row height 46px / 60px"; "headers are 12px, 600, `ink-muted`"; "flat (page and cards, separated by a `line` hairline)" |
| more than 10 rows | the body stops at the header row and 10 rows and scrolls; the header row stays at its top, its `surface` fill opaque and drawn over the rows passing under it (`z-raised`, above a row's positioned Checkbox) | the density table's row height; the brief is silent on long lists (#296) |
| row selected | the row fills with `selected`; its box is ticked | "One accent … for … selection"; `selected` is a colour role; "Colour alone never communicates state": the tick says it too |
| some selected | the header box shows a dash | as above; Checkbox's `mixed` |
| all selected | the header box is ticked | as above |
| footer, nothing selected | the footer, a `line` rule below the rows, says `none` at its start; its Buttons at the end edge are natively disabled, keeping their intent's shape (story Default) | ADR 0013: the footer is always there, its Buttons disabled until a row is ticked; "A disabled control keeps its intent's shape and leaves the tab order" |
| footer, one or more selected | `one`, or `other` with the number; the Buttons enabled, changing with the rows' `selected` fill (OneSelected, RowsSelected, AllSelected) | ADR 0013 |
| footer action pending | the Button's own pending; every Checkbox locked: `aria-disabled`, still focusable, its rest look, and ticking does nothing until the action settles, after a failure too (Pending) | ADR 0013: "the rows the operation acts on are the rows shown ticked" |
| footer on a phone | the count and the Buttons wrap onto lines of their own, the Buttons at the end edge, rather than spill; the footer stays in the frame's view as the columns scroll sideways (ActionsOnPhone) | ADR 0013: "on a phone the count and the Buttons wrap rather than spill" |
| footer under a capped body | below the body, outside its scroll, so it stays in view while the rows scroll (ManyRows, ManyRowsOnPhone) | ADR 0013: "the footer sits outside the scrolling body" |
| empty (no rows) | the header row alone, its box disabled, and no footer. No screen shows it: in its `empty` state a screen shows an EmptyState in the DataTable's place (`when: [empty]`, EmptyState's PLAN), so it has no story and a unit test holds it (#290) | "An empty screen is an invitation to act" belongs to the screen's EmptyState, which took over from P0's Heading and Text (spec § Library widening); the table only stops offering a selection it can't make |
| hover, pressed, focus-visible | Checkbox's own; in a table with no `detail` slot the row doesn't change | "Banned: hover lift on cards or rows"; such a row opens nothing |
| row that opens, hover / pressed | the row fills with `surface-hover` / `surface-pressed`, a tint and no lift; a selected row keeps `selected` | "Banned: hover lift on cards or rows": a tint isn't a lift; `surface-hover` and `surface-pressed` "deepen a neutral control" |
| row that opens, focus-visible | `focus-ring`, inset by twice its width so the surface, which scrolls sideways and so clips, doesn't cut it | focus is never colour alone; the ring is the library's one focus treatment |
| row's Sheet open | the Sheet over the scrim; the table stays as it was, selection included | ADR 0011: the open sheet is DataTable's own state, not a screen state |

No disabled table and no pending of its own: the table starts no operation; the footer Button that pays the selection shows pending, and the table only locks its Checkboxes while it does.

Money columns end-align, header included: a column whose cell node is an Amount puts its header at the end edge, above the cents. "Amounts … right-align in tables"; `tabular-numerals`.

Status columns hold still (#276): a column whose cell node is a StatusTag keeps room for the widest word StatusTag can show (`statusWords`, which StatusTag exports), whichever words its rows show. Each cell stacks every word, invisible and `aria-hidden`, in one grid area behind its own tag, which keeps its own width at the start edge. So a screen state that only changes statuses, such as bulk-pay's Pay selected, moves no column sideways while the changed rows flip. Every other cell still sizes to its content. The stories ColumnsHoldWhenStatusesChange and ColumnsHoldWhenStatusesChangeOnPhone hold the header positions and the room as style expectations.

## Token map

| Slot | When | Classes |
|---|---|---|
| `root` | always | `overflow-x-auto rounded-surface border border-line bg-surface` |
| `body` | always | `max-h-table w-max min-w-full overflow-y-auto`, plus a scroll padding of the row height in `DataTable.css` |
| `table` | always | `w-full border-collapse outline-hidden` (focus lands on it from script only, and it is no control, so no ring, as Toast and Screen) |
| `headerRow` | always | `h-row` |
| | more than 10 rows (the body scrolls down) | `sticky top-0 z-raised bg-surface` |
| `header` | always | `px-xs align-middle text-caption whitespace-nowrap text-ink-muted` |
| | other columns | `text-left` |
| | money column | `text-right` |
| `row` | always | `h-row border-t border-line transition-colors duration-base ease-standard motion-reduce:duration-fast` |
| | selected | `bg-selected` |
| | opens (a `detail` slot) | `focus-visible:focus-ring`, its offset inset in `DataTable.css` |
| | opens, not selected | `hover:bg-surface-hover active:bg-surface-pressed` |
| `cell` | always | `px-xs align-middle text-body text-nowrap text-ink *:text-nowrap` (a Text's paragraph sets its own wrap, so the cell holds its node to one line too) |
| `room` | a StatusTag cell | `inline-grid justify-items-start *:col-start-1 *:row-start-1`, around the cell's tag and every status word |
| `word` | a StatusTag cell | `invisible flex`, on each `aria-hidden` word, around a box with StatusTag's own `root` classes and no status colour |
| `select` | always | `w-0 pl-xs align-middle` |
| `selector` | always | `flex`, a box in the select cell so the Checkbox centres in the row instead of sitting on the text baseline |
| `footer` | a table with actions and rows | `sticky start-0 flex min-h-row flex-wrap items-center justify-between gap-x-sm gap-y-xs border-t border-line px-xs py-3xs`: the `line` rule the rows have, the cells' side padding, a row high while the count and the Buttons share a line (`py-3xs` keeps a control plus padding under the row height at both densities) |
| `count` | always | `flex min-h-control items-center text-body text-ink-muted`: plain text, a control high so on a line of its own it sits like the Buttons |
| `buttons` | always | `ms-auto flex flex-wrap justify-end gap-xs`: at the end edge, on a line of their own when they wrap |

The footer's Buttons change between disabled and enabled with the rows' `selected` fill, at `base` with `standard`, rather than at Button's own `fast` (ADR 0013). Button takes no class, so `DataTable.css` sets `transition-duration: base` on a Button in the footer, `fast` under reduced motion. Its hover therefore eases out at `base` too, a step slower than elsewhere; the hover in is still `fast`.

Cells don't wrap, so every row keeps the density's height: a long contractor name widens its column, and on a narrow screen the table scrolls sideways inside its surface rather than breaking an amount or a name over two lines.

The height cap (#296): `max-h-table` is a density token, the header row and 10 rows at the row height, so a table of 10 rows or fewer looks as it did before the cap and a longer one scrolls inside its frame, on a phone too. A table that fits keeps its old pixels: the frame, not the body, still scrolls sideways, since a body that scrolled sideways inside a clipping frame shifted the antialiasing of the frame's corners and inner edge by a level on a phone; and the header row is stuck, filled and raised only in a table of more than 10 rows, the ones whose body scrolls down, since a stuck box with a fill paints on a layer of its own, which shifted the corners and the header text the same way. DataTable counts the rows (`rowsInView`) rather than measuring, since every row is a row high. The body's top scroll padding is the row height, the header row's own, so focus scrolls a row or Checkbox it moves to into view below the header row, not under it; no token class sets a scroll padding from a height, so `DataTable.css` sets it. The stories ManyRows and ManyRowsOnPhone hold the cap and the sticky header, and FocusScrollsDownToRow, FocusScrollsUpToRow and FocusScrollsUpToCheckbox hold focus clear of the header, as style expectations. No pagination or virtualisation: the cap only bounds the frame.

Header weight: there is no 12px, 600 role; `text-caption` is 12px at 400 (see GAPS.md). Side padding is the 12px spacing step at both densities: spacing between nodes doesn't follow density (`.out-of-scope/density-aware-gaps.md`), and the row height gives the contractor room.

## A11y contract

- **Role**: native `table`; `th scope="col"` column headers, so each cell is read with its column's name.
- **Accessible name**: none of its own; the screen's level 1 Heading names what it lists (see GAPS.md).
- **Selection**: each row's Checkbox is named "Select `<row id>`", such as "Select INV-0142"; the header's is "Select all rows", `mixed` when some are. Selected rows carry no `aria-selected`, which a plain table doesn't support; the checkbox's checked state is what is read.
- **Keyboard**: in a table with actions, Tab moves through the checkboxes in row order, header first, then the footer's Buttons once a row is ticked; Space toggles. With a `detail` slot each row is a tab stop too, just before its own checkbox; Enter on the row opens its Sheet, and Enter on its checkbox doesn't. Escape, the Sheet's close button or a click on the scrim closes it, and focus goes back to the row (Sheet returns it to its opener). A table with neither has no tab stop.
- **Selected count**: plain text in the footer, not a live region: the Checkbox just ticked already says what changed (ADR 0013).
- **Focus**: Checkbox's ring, on `:focus-visible` only. In a table taller than its frame, a row or Checkbox that focus moves to scrolls into view below the sticky header row (#296). When the footer Button that has focus is disabled, as a confirmed result clearing the selection does, focus moves to the `<table>` (focusable from script only, no ring), next to what was acted on: not the Toast, where focus would hold a success Toast's timer, nor the Screen, further from the rows (ADR 0013, Consequences). A failed result keeps the selection, so the Button stays enabled and keeps focus.
- **Disabled**: the header box, natively, when there are no rows; the footer's Buttons, natively, while no row is ticked, so they leave the tab order and are announced unavailable.
- **Locked**: while a footer Button's action runs, every Checkbox is `aria-disabled`, announced unavailable but still focusable, and ticking does nothing until the action settles.
- **Busy**: none of its own; the pending footer Button is `aria-busy`.
- **Target size**: Checkbox's, 24×24px admin and 44×44px contractor; rows of 46px and 60px space them apart.

## Motion

| User action | Motion |
|---|---|
| ticks a row, or the header box | the row's fill crosses to `selected`, `transition-colors duration-base ease-standard` ("`base` 240ms (state change, selection)") |
| ticks the first row, or unticks the last | the footer's Buttons cross between disabled and enabled in the same `base`, `standard` transition as the row's fill; the count's words change at once (ADR 0013) |
| the first tick, or untick of the last | enters `rows-selected`, or back to the default state, through `useScreenState`'s `enter`: an untyped View Transition, `base`, `standard` (ADR 0011) |
| an action's result changes the screen state | the selection clears in the same update, so the transition carries it |
| clicks a row, or presses Enter on it, in a table with a `detail` slot | row → sheet: `transitionSheet("open")` runs a View Transition typed `sheet-open`, in which the Sheet slides in from the end edge (`slow`, `standard`, src/styles.css) and the scrim fades in; closing runs `sheet-close`, the Sheet sliding back out past the edge (`slow-exit`, `exit`). The row carries no view transition name and no mark; focus goes back to it on close. Reduced motion: a `fast` crossfade |
| an action's result changes bound statuses | the stagger (#208): only the rows whose StatusTag's status changed flip, edge-on to flat (`status-flip`, `base`, `settle`), in row order, one `delay-stagger` (40ms) apart, and from the 8th changed row on together. Unchanged rows aren't counted, so they leave no gaps ("Stagger", ADR 0011) |

No `settle` on selection: selecting isn't a confirmed result. A flip settles, since it confirms one ("a status flipping after pay"). DataTable marks a changed row `data-flip`, and `DataTable.css` holds the delays (`:nth-child(k of [data-flip])` × `delay-stagger`), so unmarked rows don't count. A table's first render flips nothing: no entrance animation on page load. A row that flips again later is re-keyed, so its flip replays. Reduced motion: the fill's transition drops to `fast`, a crossfade with nothing moving, the View Transition is already a `fast` crossfade there, and a changed row fades in at `fast` (`status-fade`), all at once (`DataTable.css`). The stories StatusesFlip and ManyStatusesFlip hold the delays as style expectations.

## Against defaults

The default version: shadcn's `Table` wrapped by a TanStack `DataTable`: a `relative w-full overflow-auto` wrapper, `h-10 px-2` heads in `font-medium text-muted-foreground`, `border-b` rows with `hover:bg-muted/50` and `data-[state=selected]:bg-muted`, a Radix checkbox column, sorting, filtering and pagination toolbars, and no outer surface.

How this one differs:

- **Row height follows the audience**, 46px admin and 60px contractor, not 40px. Brief: the density table's row height.
- **No row hover unless the row opens.** Brief: "Banned: hover lift on cards or rows"; and Linear: motion only when the user acts. A row tint that answers no action would suggest the row opens something, so only a table with a `detail` slot tints its rows, and only with a colour, never a lift.
- **Selected is heather-tinted `selected`**, not grey `muted`. Brief: the accent is for "selection".
- **Headers are 12px `ink-muted` in sentence case**, not 14px medium. Brief: "headers are 12px, 600, `ink-muted`"; "No ALL-CAPS … table headers".
- **Money end-aligns, its header too, in tabular figures**, which shadcn leaves to each cell. Brief: "Amounts always use tabular figures … and right-align in tables."
- **The table sits on a flat surface** with a `line` hairline and the surface radius, not bare on the page. Brief: "flat … separated by a `line` hairline"; "Surfaces, admin 8px / contractor 12px". No shadow: "A shadow means 'this floats', never 'this is a box'."
- **No toolbar, sorting, filtering or pagination.** Spec § Library widening 3.
- **Bulk actions sit in a footer with the selected count**, always shown, its Buttons disabled until a row is ticked, where shadcn's footer has the count and no actions, and other kits put the actions in a toolbar above or a bar that pops in. ADR 0013.
- **Matches the default** in its native table semantics, a hairline between rows, the checkbox first, and the header checkbox's mixed state; the brief is silent on all four.
