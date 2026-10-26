---
audience: admin
requires:
  components: [Screen, PageHeader, Card, Amount, StatusTag]
  states: [empty]
  actions: []
---

# Payment run

An admin checks what the next payment run holds. Put the run's date in the PageHeader, then show three Cards: **Due in this run**, **Overdue** and **Awaiting approval**, each with its total as a `display: card` Amount, its StatusTag and how many invoices it holds. The screen is read-only, with no actions.

The run is the fixtures' `paymentRun`, and its date is `paymentRun.dateLabel`. Each Card binds one of its groups: `dueInRun`, `overdue` and `awaitingApproval`. Bind each group's `amount`, `currency`, `status` and `countLabel`.

| Screen state | Fixture | What shows |
|---|---|---|
| default | the next run (`default`) | the PageHeader with the run's date, and the three Cards, each with its Amount, StatusTag and count |
| `empty` | no invoices (`payment-run/empty`) | the PageHeader with the run's date, "Nothing in this run yet" and when invoices join it |
