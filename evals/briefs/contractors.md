---
audience: admin
requires:
  components: [Screen, PageHeader, DataTable, Amount, Sheet, EmptyState]
  states: [empty]
  actions: []
  transitions: [row-to-sheet]
---

# Contractors

An admin looks up a contractor Northwind pays. On one `Screen`, under a PageHeader titled "Contractors", list them in a DataTable, one row per contractor: their name, their country, how many invoices they have open and the amount they're owed as an `Amount`. No action acts on the rows, so the table isn't selectable and has no checkboxes. Clicking a row, or pressing Enter on it, opens that contractor's details in a Sheet in the DataTable's `detail` slot: their name as its title, then their country, email and payout method, their open invoices, and what they're owed and what they've been paid this year, each as an Amount. That is the `row-to-sheet` transition. The screen is read-only, with no actions.

The rows are the fixtures' `contractors`: bind the DataTable's rows to it, and its cells to each row's `name`, `country`, `openInvoicesLabel`, and `owed` and `currency`. The Sheet binds the same row's `name`, `country`, `email`, `payoutMethod`, `openInvoicesLabel`, `owed`, `paidThisYear` and `currency`.

| Screen state | Fixture | What shows |
|---|---|---|
| default | every contractor (`default`) | the PageHeader and the DataTable, no checkboxes; clicking a row opens its Sheet |
| `empty` | no contractors (`contractors/empty`) | the PageHeader and an EmptyState: "No contractors yet", and that each one shows up here once they send their first invoice |

The open Sheet is not a screen state: the DataTable holds it.
