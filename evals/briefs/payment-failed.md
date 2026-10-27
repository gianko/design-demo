---
audience: contractor
requires:
  components: [Screen, Heading, Card, Amount, StatusTag, Button, Toast]
  states: [retry-requested, retry-failed]
  actions: [request-retry]
---

# Payment failed

A contractor finds out a payment to them bounced, and asks for it to be sent again. Title the `Screen` with a Heading, "Payment failed", then show the payment in a `Card`: the amount as an `Amount`, its status as a `StatusTag`, the invoice it was paying, the date it bounced and why, and an **Ask for a retry** action that asks Northwind to send it again. It is the only action.

The payment is the fixtures' `bouncedPayment`: bind its `amount`, `currency`, `status`, `invoiceNumber`, `dateLabel` and `reason`, and keep "Bounced " before the date as literal copy. The `request-retry` action runs the `requestRetry` operation on the payment's `id`; it enters `retry-requested` when the request goes through and `retry-failed` when it doesn't. A Toast confirms each.

| Screen state | Fixture | What shows |
|---|---|---|
| default | one bounced payment (`default`) | the Heading and the card, the Button enabled |
| `retry-requested` | retry requested (`payment-failed/retry-requested`) | the card, and a success Toast: "Retry requested. We'll tell you when Northwind sends the payment again." |
| `retry-failed` | request failed (`payment-failed/retry-failed`) | the card, a failure Toast saying what happened and what to do next, the Button still there |

Pending is not a screen state: it is the Button's own state while `request-retry` runs.
