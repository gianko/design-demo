# DataTable: component plan

## Use

The screen's list of invoices or payments, one row per item, each with a selection checkbox: bind `rows` to a fixtures list, name each column in `columns`, and put one node per column in `cell`, in the same order, its props bound to `row.*`. Selecting rows enters `rows-selected`. For the facts of one invoice use a Card; for a fixed set of named things use Cards in a Stack.

## Anatomy

No Radix primitive: Radix isn't installed, and a native `<table>` already has the roles a screen reader navigates by (table, row, column header, cell). Selection is Checkbox, which DataTable renders; the UI spec never names it (spec § Eval screen briefs).

- `root`: a `<div>`, carrying `data-component="DataTable"`. The flat surface: `line` hairline, the density's surface radius. It scrolls sideways if the columns outgrow a narrow screen, so it clips the table's corners too.
- `table`: the `<table>`, full width.
- `headerRow`: the `<tr>` in `<thead>`.
- `header`: each `<th scope="col">`, the column's name.
- `row`: each `<tr>` in `<tbody>`, one per item in `rows`.
- `cell`: each `<td>`, holding one node of the `cell` slot for that row.
- `select`: the first `<th>`/`<td>` of a row, holding its Checkbox; the header's selects every row.

Props and slots:

- `rows`: the items, bound to a fixtures list (`invoices`). Each has an `id`, which keys the row and is what selection holds.
- `columns`: each column's header, in the order of the `cell` slot's nodes.
- `selected`: the ids of the rows selected when the table first renders; none when left out. A story, or a screen state that starts with rows selected, sets it.
- `cell` slot: one template node per column, rendered once per row with that row's `row.*` bindings (ADR 0004). In code it is a function from the row to those nodes, `cell={(row) => <>…</>}`: a `ReactNode` can't read a row.
- No `detail` slot yet: it and Sheet wait for P1 (spec § PageHeader, Checkbox and DataTable).

## Variants, sizes, states

No look variant and no size: one table, density sets its size (ADR 0002). Selection is always on, the only kind P0 has (spec § Library widening 3: "selectable rows only").

| State | How it shows | Brief line |
|---|---|---|
| rest | `surface` table on a `line` hairline, `line` rules between rows, 12px `ink-muted` headers, rows at the density's row height | "Row height 46px / 60px"; "headers are 12px, 600, `ink-muted`"; "flat (page and cards, separated by a `line` hairline)" |
| row selected | the row fills with `selected`; its box is ticked | "One accent … for … selection"; `selected` is a colour role; "Colour alone never communicates state": the tick says it too |
| some selected | the header box shows a dash | as above; Checkbox's `mixed` |
| all selected | the header box is ticked | as above |
| empty (no rows) | the header row alone, its box disabled | "An empty screen is an invitation to act" belongs to the screen's Heading and Text (spec § Library widening); the table only stops offering a selection it can't make |
| hover, pressed, focus-visible | Checkbox's own; the row doesn't change | "Banned: hover lift on cards or rows"; rows aren't interactive until the row → sheet transition (P1) |

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
| `cell` | always | `px-xs align-middle text-body text-nowrap text-ink *:text-nowrap` (a Text's paragraph sets its own wrap, so the cell holds its node to one line too) |
| `select` | always | `w-0 pl-xs align-middle` |
| `selector` | always | `flex`, a box in the select cell so the Checkbox centres in the row instead of sitting on the text baseline |

Cells don't wrap, so every row keeps the density's height: a long contractor name widens its column, and on a narrow screen the table scrolls sideways inside its surface rather than breaking an amount or a name over two lines.

Header weight: there is no 12px, 600 role; `text-caption` is 12px at 400 (see GAPS.md). Side padding is the 12px spacing step at both densities: spacing between nodes doesn't follow density (`.out-of-scope/density-aware-gaps.md`), and the row height gives the contractor room.

## A11y contract

- **Role**: native `table`; `th scope="col"` column headers, so each cell is read with its column's name.
- **Accessible name**: none of its own; the screen's level 1 Heading names what it lists (see GAPS.md).
- **Selection**: each row's Checkbox is named "Select `<row id>`", such as "Select INV-0142"; the header's is "Select all rows", `mixed` when some are. Selected rows carry no `aria-selected`, which a plain table doesn't support; the checkbox's checked state is what is read.
- **Keyboard**: Tab moves through the checkboxes in row order, header first; Space toggles. Nothing else in a row takes focus in P0.
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

No `settle`: selecting isn't a confirmed result. Reduced motion: the fill's transition drops to `fast`, a crossfade with nothing moving, and the View Transition is already a `fast` crossfade there (`src/styles.css`). The stagger of changed statuses waits for P1 with the pay confirmation (ADR 0011).

## Against defaults

The default version: shadcn's `Table` wrapped by a TanStack `DataTable`: a `relative w-full overflow-auto` wrapper, `h-10 px-2` heads in `font-medium text-muted-foreground`, `border-b` rows with `hover:bg-muted/50` and `data-[state=selected]:bg-muted`, a Radix checkbox column, sorting, filtering and pagination toolbars, and no outer surface.

How this one differs:

- **Row height follows the audience**, 46px admin and 60px contractor, not 40px. Brief: the density table's row height.
- **No row hover.** Brief: "Banned: hover lift on cards or rows"; and Linear: motion only when the user acts. A row tint that answers no action would also suggest the row opens something, which it doesn't until P1.
- **Selected is heather-tinted `selected`**, not grey `muted`. Brief: the accent is for "selection".
- **Headers are 12px `ink-muted` in sentence case**, not 14px medium. Brief: "headers are 12px, 600, `ink-muted`"; "No ALL-CAPS … table headers".
- **Money end-aligns, its header too, in tabular figures**, which shadcn leaves to each cell. Brief: "Amounts always use tabular figures … and right-align in tables."
- **The table sits on a flat surface** with a `line` hairline and the surface radius, not bare on the page. Brief: "flat … separated by a `line` hairline"; "Surfaces, admin 8px / contractor 12px". No shadow: "A shadow means 'this floats', never 'this is a box'."
- **No toolbar, sorting, filtering or pagination.** Spec § Library widening 3.
- **Matches the default** in its native table semantics, a hairline between rows, the checkbox first, and the header checkbox's mixed state; the brief is silent on all four.
