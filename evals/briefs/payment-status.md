---
audience: contractor
requires:
  components: [Screen, Card, StatusTag, Amount, Button]
  states: [empty, reminder-sent, reminder-failed]
  actions: [send-reminder]
---

# Payment status

A contractor checks on one overdue invoice. On one `Screen`, show it in a `Card`: the amount as an `Amount`, its status as a `StatusTag`, the due date, the client and the invoice number, and a **Send reminder** action that asks the client to pay.

The invoice is the fixtures' `overdueInvoice`: bind its `amount`, `currency`, `status`, `dueLabel`, `client` and `number`, and keep "Due " before the due date as literal copy. The `send-reminder` action runs the `sendReminder` operation; it enters `reminder-sent` when the reminder goes out and `reminder-failed` when it doesn't.

| Screen state | Fixture | What shows |
|---|---|---|
| default | one overdue invoice (`default`) | the card, the Button enabled |
| `empty` | no invoices (`payment-status/empty`) | "No invoices yet" and what happens when one is sent |
| `reminder-sent` | reminder succeeded (`payment-status/reminder-sent`) | the card, and a live Text: "Reminder sent to Northwind. We'll tell you when they pay." |
| `reminder-failed` | reminder failed (`payment-status/reminder-failed`) | the card, a live Text saying what happened and what to do next, the Button still there |

Pending is not a screen state: it is the Button's own state while `send-reminder` runs.
