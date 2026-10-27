# DataTable: component plan

## Use

The screen's list of invoices or payments, one row per item: bind `rows` to a fixtures list, name each column in `columns`, and put one node per column in `cell`, in the same order, its props bound to `row.*`. Turn `selectable` on only when an action acts on the Selection; then each row has a checkbox, and selecting rows enters `rows-selected`. To let a row open its details, put one Sheet in `detail`, its children bound to `row.*`: clicking a row or pressing Enter on it opens that row's Sheet. A table can be selectable and have a `detail` Sheet at once. For the facts of one invoice shown on the screen itself use a Card; for a fixed set of named things use Cards in a Stack.

## Anatomy

No Radix primitive: Radix isn't installed, and a native `<table>` already has the roles a screen reader navigates by (table, row, column header, cell). Selection is Checkbox, which DataTable renders; the UI spec never names it (spec § Eval screen briefs).

- `root`: a `<div>`, carrying `data-component="DataTable"`. The flat surface: `line` hairline, the density's surface radius. It scrolls sideways if the columns outgrow a narrow screen, so it clips the table's corners too.
- `table`: the `<table>`, full width.
- `headerRow`: the `<tr>` in `<thead>`.
- `header`: each `<th scope="col">`, the column's name.
- `row`: each `<tr>` in `<tbody>`, one per item in `rows`.
- `cell`: each `<td>`, holding one node of the `cell` slot for that row.
- `select`: in a selectable table, the first `<th>`/`<td>` of a row, holding its Checkbox; the header's selects every row.

Props and slots:

- `rows`: the items, bound to a fixtures list (`invoices`). Each has an `id`, which keys the row and is what selection holds.
- `columns`: each column's header, in the order of the `cell` slot's nodes.
- `selectable`: off by default. On, each row and the header get a Checkbox and the table reads and writes the Selection; off, there are no checkboxes, no row fills with `selected`, and the table never enters `rows-selected` (#203). The registry `use` line tells the spec step to turn it on only when an action acts on the Selection.
- No `selected` prop: a fixture variant names its starting selection, and the host starts with it (GAPS.md).
- `cell` slot: one template node per column, rendered once per row with that row's `row.*` bindings (ADR 0004). In code it is a function from the row to those nodes, `cell={(row) => <>…</>}`: a `ReactNode` can't read a row.
- `detail` slot (#214): one Sheet, allow-listed, rendered for the opened row with that row's `row.*` bindings (ADR 0011), and in code a function of the row like `cell`, `detail={(row) => <Sheet …>}`. DataTable holds which row is open, not the screen state, and renders that row's Sheet inside a `SheetHost` (`Sheet/sheet-host.tsx`) after its surface, not inside it: the Sheet draws in the top layer, but it is a painted surface, and one inside another fails `nested-cards` (gap #254).

## Variants, sizes, states

No look variant and no size: one table, density sets its size (ADR 0002). Selection was always on in P0 (spec § Library widening 3: "selectable rows only"); P1 makes it the `selectable` prop, off by default, so a table nothing acts on isn't cluttered with checkboxes that do nothing. The selection states below are a selectable table's.

| State | How it shows | Brief line |
|---|---|---|
| rest | `surface` table on a `line` hairline, `line` rules between rows, 12px `ink-muted` headers, rows at the density's row height | "Row height 46px / 60px"; "headers are 12px, 600, `ink-muted`"; "flat (page and cards, separated by a `line` hairline)" |
| row selected | the row fills with `selected`; its box is ticked | "One accent … for … selection"; `selected` is a colour role; "Colour alone never communicates state": the tick says it too |
| some selected | the header box shows a dash | as above; Checkbox's `mixed` |
| all selected | the header box is ticked | as above |
| empty (no rows) | the header row alone, its box disabled | "An empty screen is an invitation to act" belongs to the screen's Heading and Text (spec § Library widening); the table only stops offering a selection it can't make |
| hover, pressed, focus-visible | Checkbox's own; in a table with no `detail` slot the row doesn't change | "Banned: hover lift on cards or rows"; such a row opens nothing |
| row that opens, hover / pressed | the row fills with `surface-hover` / `surface-pressed`, a tint and no lift; a selected row keeps `selected` | "Banned: hover lift on cards or rows": a tint isn't a lift; `surface-hover` and `surface-pressed` "deepen a neutral control" |
| row that opens, focus-visible | `focus-ring`, inset by twice its width so the surface, which scrolls sideways and so clips, doesn't cut it | focus is never colour alone; the ring is the library's one focus treatment |
| row's Sheet open | the Sheet over the scrim; the table stays as it was, selection included | ADR 0011: the open sheet is DataTable's own state, not a screen state |

No disabled table and no pending: the table starts no operation; the Button that pays the selection shows pending.

Money columns end-align, header included: a column whose cell node is an Amount puts its header at the end edge, above the cents. "Amounts … right-align in tables"; `tabular-numerals`.

## Token map

| Slot | When | Classes |
|---|---|---|
| `root` | always | `overflow-x-auto rounded-surface border border-line bg-surface` |
| `table` | always | `w-full border-collapse` |
| `headerRow` | always | `h-row` |
| `header` | always | `px-xs align-middle text-caption whitespace-nowrap text-ink-muted` |
| | other columns | `text-left` |
| | money column | `text-right` |
| `row` | always | `h-row border-t border-line transition-colors duration-base ease-standard motion-reduce:duration-fast` |
| | selected | `bg-selected` |
| | opens (a `detail` slot) | `focus-visible:focus-ring`, its offset inset in `DataTable.css` |
| | opens, not selected | `hover:bg-surface-hover active:bg-surface-pressed` |
| `cell` | always | `px-xs align-middle text-body text-nowrap text-ink *:text-nowrap` (a Text's paragraph sets its own wrap, so the cell holds its node to one line too) |
| `select` | always | `w-0 pl-xs align-middle` |
| `selector` | always | `flex`, a box in the select cell so the Checkbox centres in the row instead of sitting on the text baseline |

Cells don't wrap, so every row keeps the density's height: a long contractor name widens its column, and on a narrow screen the table scrolls sideways inside its surface rather than breaking an amount or a name over two lines.

Header weight: there is no 12px, 600 role; `text-caption` is 12px at 400 (see GAPS.md). Side padding is the 12px spacing step at both densities: spacing between nodes doesn't follow density (`.out-of-scope/density-aware-gaps.md`), and the row height gives the contractor room.

## A11y contract

- **Role**: native `table`; `th scope="col"` column headers, so each cell is read with its column's name.
- **Accessible name**: none of its own; the screen's level 1 Heading names what it lists (see GAPS.md).
- **Selection**: each row's Checkbox is named "Select `<row id>`", such as "Select INV-0142"; the header's is "Select all rows", `mixed` when some are. Selected rows carry no `aria-selected`, which a plain table doesn't support; the checkbox's checked state is what is read.
- **Keyboard**: in a selectable table, Tab moves through the checkboxes in row order, header first; Space toggles. With a `detail` slot each row is a tab stop too, just before its own checkbox; Enter on the row opens its Sheet, and Enter on its checkbox doesn't. Escape or the Sheet's close button closes it, and focus goes back to the row (Sheet returns it to its opener). A table with neither has no tab stop.
- **Focus**: Checkbox's ring, on `:focus-visible` only.
- **Disabled**: the header box, natively, when there are no rows.
- **Busy**: none.
- **Target size**: Checkbox's, 24×24px admin and 44×44px contractor; rows of 46px and 60px space them apart.

## Motion

| User action | Motion |
|---|---|
| ticks a row, or the header box | the row's fill crosses to `selected`, `transition-colors duration-base ease-standard` ("`base` 240ms (state change, selection)") |
| the first tick, or untick of the last | enters `rows-selected`, or back to the default state, through `useScreenState`'s `enter`: an untyped View Transition, `base`, `standard` (ADR 0011) |
| an action's result changes the screen state | the selection clears in the same update, so the transition carries it |
| clicks a row, or presses Enter on it, in a table with a `detail` slot | row → sheet: `transitionSheet("open")` runs a View Transition typed `sheet-open`, the row carrying the `row-detail` name in the old view, so it expands into the sheet (`slow`, `standard`, Sheet.css); closing runs `sheet-close` back into the row (`slow-exit`, `exit`). Reduced motion: a `fast` crossfade |
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
- **Matches the default** in its native table semantics, a hairline between rows, the checkbox first, and the header checkbox's mixed state; the brief is silent on all four.
