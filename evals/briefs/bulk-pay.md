---
audience: admin
requires:
  components: [Screen, PageHeader, DataTable, StatusTag, Amount, ActionBar, Button, Toast, EmptyState]
  states: [empty, rows-selected, payment-scheduled, payment-failed]
  actions: [pay-selected]
  transitions: [bar-to-toast]
---

# Bulk pay

An admin pays several invoices at once. On one `Screen`, under a PageHeader titled "Pay invoices", show the invoices awaiting approval in a selectable DataTable, one row per invoice: its number, the contractor, the amount as an `Amount`, the due date and its status as a `StatusTag`. Selecting rows enters `rows-selected`. An ActionBar right after the DataTable, shown only `when: [rows-selected]`, holds a **Pay selected** Button that pays the selected invoices. Once the payment is confirmed, the bar becomes a success Toast, so leave the ActionBar out of `payment-scheduled`: that is the `bar-to-toast` transition. When the payment fails, keep the ActionBar and the selection for a retry, with a failure Toast right before the bar.

The rows are the fixtures' `payQueue`: bind the DataTable's rows to it, and its cells to each row's `number`, `contractor`, `amount` and `currency`, `dueLabel` and `status`. The `pay-selected` action runs the `payInvoices` operation on the selected rows' ids; it enters `payment-scheduled` when the payment is scheduled and `payment-failed` when it isn't.

| Screen state | Fixture | What shows |
|---|---|---|
| default | the awaiting invoices (`default`) | the PageHeader and the DataTable, no rows selected and no ActionBar |
| `empty` | nothing to pay (`bulk-pay/empty`) | the PageHeader and, in the DataTable's place, an EmptyState: "No invoices to pay", and that new ones show up here when contractors send them |
| `rows-selected` | rows selected (`bulk-pay/rows-selected`) | the DataTable with rows selected, and the ActionBar with the Pay selected Button |
| `payment-scheduled` | payment scheduled (`bulk-pay/payment-scheduled`) | the DataTable with the paid rows now scheduled and none selected, no ActionBar, and a success Toast where it was: "3 invoices scheduled for the Oct 24 run." |
| `payment-failed` | payment failed (`bulk-pay/payment-failed`) | the DataTable with the rows as they were and still selected, a failure Toast saying what happened and what to do next, and the ActionBar after it |

Pending is not a screen state: it is the Button's own state while `pay-selected` runs.
