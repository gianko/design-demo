---
audience: contractor
requires:
  components: [Screen, Heading, Card, Amount, StatusTag]
  states: [empty]
  actions: []
---

# Payment overview

A contractor checks on their money: what's coming next, what came last, and what they've been paid this year. Title the screen with a Heading, then show three Cards: **Next payment**, **Last payment** and **Paid this year**. The screen is read-only, with no actions.

Each Card binds one of the fixtures' named paths. Next payment is `nextPayment`: bind its `amount`, `currency` and `status`, and keep "Arrives " before its `dateLabel` as literal copy. Last payment is `lastPayment`: bind its `amount`, `currency` and `status`, with "Arrived " before its `dateLabel`. Paid this year is `paidThisYear`, a total: bind its `amount` and `currency`. It has no status, so it has no StatusTag.

| Screen state | Fixture | What shows |
|---|---|---|
| default | your payments (`default`) | the Heading and the three Cards, each with its Amount, and a StatusTag on next and last payment |
| `empty` | a new contractor (`payment-overview/empty`) | "No payments yet" and when the first one shows up |
