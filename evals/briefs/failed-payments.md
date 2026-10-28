---
audience: admin
requires:
  components: [Screen, PageHeader, DataTable, StatusTag, Amount, Button, Toast, EmptyState]
  states: [empty, payments-retried, retry-failed]
  actions: [retry-payments]
  transitions: [table-action-to-toast]
---

# Failed payments

An admin recovers the payments that contractors' banks sent back. On one `Screen`, under a PageHeader titled "Failed payments", show them in a DataTable, one row per bounced payment: the contractor, the invoice it paid, the amount as an `Amount`, the date it bounced, the bank's reason and its status as a `StatusTag`. A **Retry payments** Button in the DataTable's `actions` slot, its footer, sends each payment the admin ticks again in the next run; give the table `selectionText` for its selected count: "No payments selected", "1 payment selected" and "{count} payments selected". When the retry is scheduled, a success Toast shows, and when it isn't, a failure Toast, each last in the Screen in the state its outcome enters (`table-action-to-toast`).

The rows are the fixtures' `failedPayments`: bind the DataTable's rows to it, and its cells to each row's `contractor`, `invoiceId`, `amount` and `currency`, `dateLabel`, `reason` and `status`. The `retry-payments` action runs the `retryPayments` operation on the selected rows' ids; it enters `payments-retried` when the retry is scheduled and `retry-failed` when it isn't.

| Screen state | Fixture | What shows |
|---|---|---|
| default | the bounced payments (`default`) | the PageHeader and the DataTable, its footer saying no payments are selected |
| `empty` | no bounced payments (`failed-payments/empty`) | the PageHeader and an EmptyState: "No failed payments", and that a payment a bank sends back shows up here |
| `payments-retried` | retry scheduled (`failed-payments/payments-retried`) | the DataTable with the retried rows now scheduled and none selected, and a success Toast: "Payments retried in the Oct 24 run." |
| `retry-failed` | retry failed (`failed-payments/retry-failed`) | the DataTable with the rows as they were and still selected, and a failure Toast saying what happened and what to do next |

Ticking rows is not a screen state: the selection is the table's own. Pending is not one either: it is the Button's own state while `retry-payments` runs.
