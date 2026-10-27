# DataTable: gaps

Each entry is one place the brief, ADRs or tokens didn't decide something DataTable needed, the call made, and the alternative a human might prefer.

## No 12px, 600 type role for table headers

**Undecided:** the brief says table headers are "12px, 600, `ink-muted`". The only 12px role, `text-caption`, is weight 400, and there are no standalone weight utilities to make it 600 (ADR 0005). `.out-of-scope/status-tag-type-role.md` expected DataTable to add the role, but a build session can't add tokens (ADR 0006).

**Call:** headers use `text-caption text-ink-muted`: 12px at 400. The size matches the brief; the weight doesn't, so the headers read lighter than the brief asks, especially in dark.

**Alternative:** a `header` (or `column-header`) type role in `type.json`: 12px, 16px line height, weight 600, so `text-header` gives the brief's style in one class. DataTable's header slot then swaps `text-caption` for it.

**Decided (#185):** the alternative, named `column-header`: 12px, 16px line height, weight 600, no tracking, at both densities. The headers use `text-column-header text-ink-muted`, and the stories' style expectations assert weight 600.

**Revised:** at 12px the headers read small beside 16px contractor cells. MUI and shadcn set headers at the cells' size and tell them apart by weight alone, so `column-header` is now a density token at the body's size (14px admin, 16px contractor), still 600, and the brief says so. Weight and `ink-muted` do the work the smaller size did.

## The cell slot is a function of the row, not a ReactNode

**Undecided:** a slot other than `body` is a `ReactNode` prop named after it (spec § Registry core), and the code step's prompt says so. A `ReactNode` can't read a row, so it can't hold `row.*` bindings that render once per row (ADR 0004).

**Call:** `cell` is `(row) => ReactNode`, giving one node per column for that row, usually a fragment, as `cell={(row) => <><Text text={row.number} /><Amount … /></>}`. DataTable splits the nodes into columns in order and throws if the count doesn't match `columns`. The registry `use` line tells the code step, since it reads that line.

**Alternative:** a line in the code step's prompt (`generator/prompts.ts`) for row-scoped slots, so the contract lives where the code step's other rules do, or a `rowScoped: true` flag on a registry slot that both the prompt and gate 1's `rowSlots` read.

**Decided (#186):** the prompt line. The code step's instructions pass a node in a DataTable's row slot as a function of the row and read its `row.*` paths from that function's argument, naming the slots from gate 1's exported `rowSlots`, so the two can't drift. The registry `use` line no longer tells the code step how to pass `cell`.

## Leaving rows-selected clears the selection, after a failure too

**Undecided:** the spec says an action's success clears the selection, and ADR 0011 says that on failure "the rows stay selected". DataTable sees only the screen state's name through `useScreenState`; the host doesn't expose whether the transition into the new state was `confirm` or `fail`, so DataTable can't tell success from failure.

**Call:** the selection clears whenever the screen leaves `rows-selected`, in the same render, so the state's View Transition carries it. In invoice-queue the Approve and pay Button shows only in `rows-selected`, so after a failure the admin re-ticks the rows to try again.

**Alternative:** ScreenHost exposes the type of the last transition (or `useAction` clears a library-held selection on success only), so DataTable keeps the rows after `fail` and the Button can stay for a retry.

**Decided (#188, for #187):** the `ScreenHost` holds the selection and clears it inside a `confirm` transition's update; a `fail` keeps it. After a failure, ticking or unticking a row brings the screen back to `rows-selected`.

## A generated screen can't read the selected rows' ids

**Undecided:** invoice-queue's `approve-and-pay` runs `payInvoices` "on the selected rows' ids", but DataTable holds its selection inside itself, and a generated screen may not hold state (`screen-state-via-library`), so it has no way to get the ids to pass to `run`.

**Call:** no way out of DataTable for the selection. The mock `payInvoices` settles the same whatever ids it gets, so the gates still pass, but each rep will invent the argument.

**Alternative:** a library hook, such as `useSelectedRows()`, backed by the ScreenHost so DataTable and the screen's action read one selection, plus a line in the code step's prompt saying to call `run(useSelectedRows())`. That is a change to Screen's host, outside this component.

**Decided (#188):** the alternative. DataTable reads and writes the selection through the `ScreenHost`, a generated screen reads it with `useSelectedRows()`, and the code step's instructions pass that to `payInvoices`.

## The rows-selected fixture variant doesn't say which rows are selected

**Undecided:** a story or kept screen rendered straight into `rows-selected` (fixture `invoice-queue/rows-selected`) should show rows ticked, but the variant's data has nothing naming them; only a comment says the awaiting ones are meant.

**Call:** a `selected` prop, the ids selected when the table first renders. DataTable's own stories set it by hand to the three awaiting invoices. A UI spec has nothing to bind it to, and writing the ids as a literal would copy fixture data, so a generated rows-selected render will show the Button with no row ticked.

**Alternative:** a `selectedInvoiceIds` list in every fixture variant (empty except in `invoice-queue/rows-selected`), which the UI spec binds `selected` to.

**Decided (#188, for #189):** a fixture variant names its starting selection beside its `fails`, outside its `data`, so no UI spec binds it, and the host starts with it. `invoice-queue/rows-selected` and `invoice-queue/payment-failed` name the three awaiting invoices. The `selected` prop is gone.

## Row checkboxes are named from the row's id

**Undecided:** each row's Checkbox needs an accessible name saying which row it selects, and DataTable only knows the row's `id` and its cell nodes.

**Call:** "Select `<id>`", such as "Select INV-0142". It reads well only because an invoice's id is its number. The header's is "Select all rows".

**Alternative:** a `rowName` prop naming the row field that says what a row is (`number` for invoices), or the checkbox labelled by the row's first cell (`aria-labelledby`), which would need Checkbox to take a labelling id.

## Cells stay on one line, and a narrow table scrolls sideways

**Undecided:** the brief gives a row height but says nothing about long values in a row or a table wider than a phone.

**Call:** cells don't wrap, so every row keeps the density's height and amounts never break; a long contractor name widens its column, and when the columns outgrow the screen the table scrolls sideways inside its surface (the Phone story). Nothing is truncated, so nothing is hidden behind an ellipsis.

**Alternative:** columns with a maximum width that truncate with an ellipsis and a tooltip, or on a phone each row stacked as a small label–value list. Both need decisions (a column width token, a breakpoint) the brief doesn't make yet.

## A row that opens its Sheet doesn't say so to a screen reader

**Undecided:** ADR 0011 and the spec say clicking a row or pressing Enter on it opens its Sheet, so the row itself takes focus. A focused `<tr>` is read as its cells; nothing tells a screen reader user that Enter opens a dialog. `aria-haspopup` and `aria-expanded` aren't allowed on a plain table's `row` (axe `aria-allowed-attr`), and a `grid` role would bring arrow-key navigation the table doesn't have.

**Call:** the row is a plain focusable `<tr>` (`tabIndex=0`) with no added semantics. Sighted keyboard users see the focus ring and the hover tint; a screen reader user hears the row's cells, and finds that Enter opens the details only by trying it.

**Alternative:** a visually hidden "Open details" button in the row's first cell (or an `aria-describedby` hint on each row) that opens the same Sheet; or the first cell's Text as a link-styled button. Either adds a node per row the spec doesn't name.

## The row's focus ring is inset by a raw multiple in CSS

**Undecided:** the table's surface scrolls sideways (`overflow-x-auto`), so it clips a ring drawn outside a row: `focus-ring`'s outward offset would show only the ring's top and bottom. No token class sets an inward offset.

**Call:** `DataTable.css` sets `outline-offset: calc(var(--ds-size-height-edge) * -2)` on a focused DataTable row, so `focus-ring` sits just inside the row.

**Alternative:** an inset focus-ring utility in the token build (`focus-ring-inset`), which any clipped focusable (a list row, a tab) could reuse.
