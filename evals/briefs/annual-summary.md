---
audience: contractor
requires:
  components: [Screen, Heading, Card, Amount, DataTable, EmptyState]
  states: [empty]
  actions: []
---

# Annual summary

A contractor looks back on what they've earned this year. Title the `Screen` with a Heading, "Your year so far", then a `Card` for each of two totals: **Paid this year**, and **Monthly average** over the months you've been paid in, each as a `display: card` Amount. Under them, show the monthly totals in a DataTable, one row per month, newest first: the month, what you were paid as an `Amount`, how many payments came in and how many invoices they paid. Nothing acts on the rows, so the table isn't selectable, and a row opens nothing. The screen is read-only, with no actions.

The Cards bind the fixtures' `paidThisYear` and `monthlyAverage`, each its `amount` and `currency`. The DataTable's rows are the fixtures' `monthlyTotals`: bind its cells to each row's `monthLabel`, `amount` and `currency`, `paymentCountLabel` and `invoiceCountLabel`. When you haven't been paid yet, an EmptyState takes the place of the Cards and the DataTable.

| Screen state | Fixture | What shows |
|---|---|---|
| default | your year (`default`) | the Heading, the two Cards, and the DataTable, one row per month and no checkboxes |
| `empty` | a new contractor (`annual-summary/empty`) | the Heading and an EmptyState: "Nothing paid yet this year", and that your monthly totals show up here once Northwind pays an invoice |
