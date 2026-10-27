---
audience: contractor
requires:
  components:
    [Screen, Heading, Card, Amount, StatusTag, Text, Button, Toast, EmptyState]
  states: [invoice-withdrawn, withdraw-failed]
  actions: [withdraw-invoice]
---

# Withdraw invoice

A contractor takes back an invoice they sent by mistake, before Northwind approves it. Title the `Screen` with a Heading, "Withdraw invoice", then show the invoice in a `Card`: its number, the amount as an `Amount`, its status as a `StatusTag`, and a Text each for the due date, the client and the line count, with a **Withdraw invoice** action that takes it back. It is the only action. Once the invoice is withdrawn the card goes, and an EmptyState takes its place.

The invoice is the fixtures' `awaitingInvoice`: bind its `number`, `amount`, `currency`, `status`, `dueLabel`, `client` and `lineCountLabel`, and keep "Due " before the due date and "Billed to " before the client as literal copy. The `withdraw-invoice` action runs the `withdrawInvoice` operation on the invoice's `id`; it enters `invoice-withdrawn` when the invoice is withdrawn and `withdraw-failed` when it isn't. A Toast confirms each.

| Screen state | Fixture | What shows |
|---|---|---|
| default | your awaiting invoice (`default`) | the Heading and the card, the Button enabled |
| `invoice-withdrawn` | invoice withdrawn (`withdraw-invoice/invoice-withdrawn`) | the Heading, an EmptyState in the card's place: "No invoices awaiting approval", and that an invoice you send waits here until Northwind approves it, and a success Toast: "Invoice withdrawn. Send a corrected one when you're ready." |
| `withdraw-failed` | withdraw failed (`withdraw-invoice/withdraw-failed`) | the card, a failure Toast saying what happened and what to do next, the Button still there |

Pending is not a screen state: it is the Button's own state while `withdraw-invoice` runs.
