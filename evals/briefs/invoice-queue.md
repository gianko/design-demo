---
audience: admin
requires:
  components: [Screen, PageHeader, DataTable, StatusTag, Amount, Button]
  states: [empty, rows-selected, payment-scheduled, payment-failed]
  actions: [approve-and-pay]
---

# Invoice queue

An admin works through the invoices contractors have sent in. On one `Screen`, under a PageHeader titled "Invoices", show them in a selectable DataTable, one row per invoice: its number, the contractor, the amount as an `Amount`, the due date and its status as a `StatusTag`. Selecting rows enters `rows-selected`. An **Approve and pay** Button sits in the PageHeader's `actions` slot, shown only `when: [rows-selected]`, and pays the selected invoices.

The rows are the fixtures' `invoices`: bind the DataTable's rows to it, and its cells to each row's `number`, `contractor`, `amount` and `currency`, `dueLabel` and `status`. The `approve-and-pay` action runs the `payInvoices` operation on the selected rows' ids; it enters `payment-scheduled` when the payment is scheduled and `payment-failed` when it isn't.

| Screen state | Fixture | What shows |
|---|---|---|
| default | the queue (`default`) | the PageHeader and the DataTable, no rows selected and no Button |
| `empty` | no invoices (`invoice-queue/empty`) | the PageHeader, "No invoices to pay" and when new ones show up |
| `rows-selected` | rows selected (`invoice-queue/rows-selected`) | the DataTable with rows selected, and the Approve and pay Button in the PageHeader |
| `payment-scheduled` | payment scheduled (`invoice-queue/payment-scheduled`) | the DataTable with the paid rows now scheduled, and a live Text: "3 invoices scheduled for the Oct 24 run." |
| `payment-failed` | payment failed (`invoice-queue/payment-failed`) | the DataTable with the rows as they were, and a live Text saying what happened and what to do next |

Pending is not a screen state: it is the Button's own state while `approve-and-pay` runs.
