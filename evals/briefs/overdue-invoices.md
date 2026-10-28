---
audience: admin
requires:
  components: [Screen, PageHeader, DataTable, StatusTag, Amount, Sheet, Heading, ActionBar, Button, Toast, EmptyState]
  states: [empty, rows-selected, reminders-sent, reminders-failed]
  actions: [send-reminders]
  transitions: [bar-to-toast, row-to-sheet]
---

# Overdue invoices

An admin chases the invoices that are past due. On one `Screen`, under a PageHeader titled "Overdue invoices", show them in a selectable DataTable, one row per invoice: its number, the contractor, the amount as an `Amount`, the due date and its status as a `StatusTag`. Clicking a row opens its details in a `Sheet` in the DataTable's `detail` slot: a `Heading` with the invoice number, then the amount and the status, then only what the row doesn't show: the description, the issued date, the client and the line count. Selecting rows enters `rows-selected`. An ActionBar right after the DataTable, shown only `when: [rows-selected]`, holds a **Send reminders** Button that sends a payment reminder for each selected invoice. When the reminders go out, the bar becomes a `Toast` (`bar-to-toast`); opening a row is `row-to-sheet`.

The rows are the fixtures' `overdueInvoices`: bind the DataTable's rows to it, its cells to each row's `number`, `contractor`, `amount` and `currency`, `dueLabel` and `status`, and the Sheet's nodes to the same row's `number`, `amount`, `currency`, `status`, `description`, `issuedLabel`, `client` and `lineCountLabel`. Keep "Issued " before the issued date in the Sheet as literal copy. The `send-reminders` action runs the `sendReminders` operation on the selected rows' ids; it enters `reminders-sent` when the reminders go out and `reminders-failed` when they don't.

| Screen state | Fixture | What shows |
|---|---|---|
| default | the overdue invoices (`default`) | the PageHeader and the DataTable, no rows selected and no ActionBar |
| `empty` | nothing overdue (`overdue-invoices/empty`) | the PageHeader and an EmptyState: "No overdue invoices", and that invoices past their due date show up here |
| `rows-selected` | rows selected (`overdue-invoices/rows-selected`) | the DataTable with rows selected, and the ActionBar with the Send reminders Button |
| `reminders-sent` | reminders sent (`overdue-invoices/reminders-sent`) | the DataTable with no rows selected, and a success Toast where the ActionBar was: "Reminders sent for 2 overdue invoices." |
| `reminders-failed` | reminders failed (`overdue-invoices/reminders-failed`) | the DataTable with the rows still selected, and the ActionBar still there to retry, with a failure Toast inside it, above its Button, saying what happened and what to do next |

Pending is not a screen state: it is the Button's own state while `send-reminders` runs.
