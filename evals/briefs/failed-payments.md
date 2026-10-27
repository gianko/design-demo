---
audience: admin
requires:
  components: [Screen, PageHeader, DataTable, StatusTag, Amount, ActionBar, Button, Toast, EmptyState]
  states: [empty, rows-selected, payments-retried, retry-failed]
  actions: [retry-payments]
  transitions: [bar-to-toast]
---

# Failed payments

An admin recovers the payments that contractors' banks sent back. On one `Screen`, under a PageHeader titled "Failed payments", show them in a selectable DataTable, one row per bounced payment: the contractor, the invoice it paid, the amount as an `Amount`, the date it bounced, the bank's reason and its status as a `StatusTag`. Selecting rows enters `rows-selected`. An ActionBar right after the DataTable, shown only `when: [rows-selected]`, holds a **Retry payments** Button that sends each selected payment again in the next run. When the retry is scheduled, the bar becomes a `Toast` (`bar-to-toast`).

The rows are the fixtures' `failedPayments`: bind the DataTable's rows to it, and its cells to each row's `contractor`, `invoiceId`, `amount` and `currency`, `dateLabel`, `reason` and `status`. The `retry-payments` action runs the `retryPayments` operation on the selected rows' ids; it enters `payments-retried` when the retry is scheduled and `retry-failed` when it isn't.

| Screen state | Fixture | What shows |
|---|---|---|
| default | the bounced payments (`default`) | the PageHeader and the DataTable, no rows selected and no ActionBar |
| `empty` | no bounced payments (`failed-payments/empty`) | the PageHeader and an EmptyState: "No failed payments", and that a payment a bank sends back shows up here |
| `rows-selected` | rows selected (`failed-payments/rows-selected`) | the DataTable with rows selected, and the ActionBar with the Retry payments Button |
| `payments-retried` | retry scheduled (`failed-payments/payments-retried`) | the DataTable with the retried rows now scheduled and none selected, and a success Toast where the ActionBar was: "Payments retried in the Oct 24 run." |
| `retry-failed` | retry failed (`failed-payments/retry-failed`) | the DataTable with the rows as they were and still selected, and the ActionBar still there to retry, with a failure Toast inside it, above its Button, saying what happened and what to do next |

Pending is not a screen state: it is the Button's own state while `retry-payments` runs.
