---
audience: admin
requires:
  components: [Screen, PageHeader, DataTable, StatusTag, Amount, Sheet, Heading, Button, Toast, EmptyState]
  states: [empty, reminders-sent, reminders-failed]
  actions: [send-reminders]
  transitions: [table-action-to-toast, row-to-sheet]
---

# Overdue invoices

An admin chases the invoices that are past due. On one `Screen`, under a PageHeader titled "Overdue invoices", show them in a DataTable, one row per invoice: its number, the contractor, the amount as an `Amount`, the due date and its status as a `StatusTag`. Clicking a row opens its details in a `Sheet` in the DataTable's `detail` slot: a `Heading` with the invoice number, then the amount and the status, then only what the row doesn't show: the description, the issued date, the client and the line count. A **Send reminders** Button in the DataTable's `actions` slot, its footer, sends a payment reminder for each invoice the admin ticks; give the table `selectionText` for its selected count: "No invoices selected", "1 invoice selected" and "{count} invoices selected". When the reminders go out, a success Toast shows, and when they don't, a failure Toast, each last in the Screen in the state its outcome enters (`table-action-to-toast`); opening a row is `row-to-sheet`.

The rows are the fixtures' `overdueInvoices`: bind the DataTable's rows to it, its cells to each row's `number`, `contractor`, `amount` and `currency`, `dueLabel` and `status`, and the Sheet's nodes to the same row's `number`, `amount`, `currency`, `status`, `description`, `issuedLabel`, `client` and `lineCountLabel`. Keep "Issued " before the issued date in the Sheet as literal copy. The `send-reminders` action runs the `sendReminders` operation on the selected rows' ids; it enters `reminders-sent` when the reminders go out and `reminders-failed` when they don't.

| Screen state | Fixture | What shows |
|---|---|---|
| default | the overdue invoices (`default`) | the PageHeader and the DataTable, its footer saying no invoices are selected |
| `empty` | nothing overdue (`overdue-invoices/empty`) | the PageHeader and an EmptyState: "No overdue invoices", and that invoices past their due date show up here |
| `reminders-sent` | reminders sent (`overdue-invoices/reminders-sent`) | the DataTable with no rows selected, and a success Toast: "Reminders sent for 2 overdue invoices." |
| `reminders-failed` | reminders failed (`overdue-invoices/reminders-failed`) | the DataTable with the rows still selected for a retry, and a failure Toast saying what happened and what to do next |

Ticking rows is not a screen state: the selection is the table's own. Pending is not one either: it is the Button's own state while `send-reminders` runs.
