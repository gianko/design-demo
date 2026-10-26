---
audience: admin
requires:
  components: [Screen, PageHeader, Card, Amount, StatusTag, Button]
  states: [payment-scheduled, payment-failed]
  actions: [approve-and-pay]
---

# Invoice review

An admin reviews one invoice before paying it. On one `Screen`, under a PageHeader titled "Review invoice", show it in a `Card`: the amount as an `Amount`, its status as a `StatusTag`, the contractor, the invoice number, the due date and the line count, and an **Approve and pay** action that schedules it into the next payment run. It is the only action.

The invoice is the fixtures' `reviewInvoice`: bind its `amount`, `currency`, `status`, `contractor`, `number`, `dueLabel` and `lineCountLabel`, and keep "Due " before the due date as literal copy. The `approve-and-pay` action runs the `payInvoices` operation on this one invoice's `id`; it enters `payment-scheduled` when the payment is scheduled and `payment-failed` when it isn't.

| Screen state | Fixture | What shows |
|---|---|---|
| default | one awaiting invoice (`default`) | the PageHeader and the card, the Button enabled |
| `payment-scheduled` | payment scheduled (`invoice-review/payment-scheduled`) | the card, now scheduled, and a live Text: "Payment scheduled for the Oct 24 run." |
| `payment-failed` | payment failed (`invoice-review/payment-failed`) | the card, a live Text saying what happened and what to do next, the Button still there |

Pending is not a screen state: it is the Button's own state while `approve-and-pay` runs.
