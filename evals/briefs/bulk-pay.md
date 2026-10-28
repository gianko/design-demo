---
audience: admin
requires:
  components: [Screen, PageHeader, DataTable, StatusTag, Amount, Button, Toast, EmptyState]
  states: [empty, payment-scheduled, payment-failed]
  actions: [pay-selected]
  transitions: [table-action-to-toast]
---

# Bulk pay

An admin pays several invoices at once. On one `Screen`, under a PageHeader titled "Pay invoices", show the invoices awaiting approval in a DataTable, one row per invoice: its number, the contractor, the amount as an `Amount`, the due date and its status as a `StatusTag`. A **Pay selected** Button in the DataTable's `actions` slot, its footer, pays the invoices the admin ticks; give the table `selectionText` for its selected count: "No invoices selected", "1 invoice selected" and "{count} invoices selected". Once the payment is confirmed, a success Toast shows; when it fails, a failure Toast says so, and the rows stay ticked for a retry. Put each Toast last in the Screen, in the state its outcome enters: that is the `table-action-to-toast` transition.

The rows are the fixtures' `payQueue`: bind the DataTable's rows to it, and its cells to each row's `number`, `contractor`, `amount` and `currency`, `dueLabel` and `status`. The `pay-selected` action runs the `payInvoices` operation on the selected rows' ids; it enters `payment-scheduled` when the payment is scheduled and `payment-failed` when it isn't.

| Screen state | Fixture | What shows |
|---|---|---|
| default | the awaiting invoices (`default`) | the PageHeader and the DataTable, its footer saying no invoices are selected |
| `empty` | nothing to pay (`bulk-pay/empty`) | the PageHeader and, in the DataTable's place, an EmptyState: "No invoices to pay", and that new ones show up here when contractors send them |
| `payment-scheduled` | payment scheduled (`bulk-pay/payment-scheduled`) | the DataTable with the paid rows now scheduled and none selected, and a success Toast: "3 invoices scheduled for the Oct 24 run." |
| `payment-failed` | payment failed (`bulk-pay/payment-failed`) | the DataTable with the rows as they were and still selected, and a failure Toast saying what happened and what to do next |

Ticking rows is not a screen state: the selection is the table's own. Pending is not one either: it is the Button's own state while `pay-selected` runs.
