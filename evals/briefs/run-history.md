---
audience: admin
requires:
  components: [Screen, PageHeader, DataTable, StatusTag, Amount, Sheet, EmptyState]
  states: [empty]
  actions: []
  transitions: [row-to-sheet]
---

# Run history

An admin checks what past payment runs sent out. On one `Screen`, under a PageHeader titled "Payment runs", list the runs that have gone out, newest first, in a DataTable, one row per run: its date, how many invoices it held, its total as an `Amount` and its status as a `StatusTag`, paid when every payment went through and failed when one bounced. No action acts on the rows, so the table isn't selectable and has no checkboxes. Clicking a row, or pressing Enter on it, opens that run's breakdown in a Sheet in the DataTable's `detail` slot: the run's date as its title, its StatusTag, how many contractors it paid, then what went through and what bounced, each as a count and an Amount. That is the `row-to-sheet` transition. The screen is read-only, with no actions.

The rows are the fixtures' `pastRuns`: bind the DataTable's rows to it, and its cells to each row's `dateLabel`, `countLabel`, `amount` and `currency`, and `status`. The Sheet binds the same row's `dateLabel`, `status`, `contractorsLabel`, `paidCountLabel` and `paidAmount`, `failedCountLabel` and `failedAmount`, and `currency`.

| Screen state | Fixture | What shows |
|---|---|---|
| default | the past runs (`default`) | the PageHeader and the DataTable, no checkboxes; clicking a row opens its Sheet |
| `empty` | no runs yet (`run-history/empty`) | the PageHeader and an EmptyState: "No payment runs yet", and that each run shows up here once it goes out |

The open Sheet is not a screen state: the DataTable holds it.
