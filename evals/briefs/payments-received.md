---
audience: contractor
requires:
  components: [Screen, Heading, DataTable, Amount, Sheet, EmptyState]
  states: [empty]
  actions: []
  transitions: [row-to-sheet]
---

# Payments received

A contractor reconciles their accounts: which payments came in, and which invoices each one paid. Title the `Screen` with a Heading, "Payments received", then show the payments in a DataTable, one row per payment: the date it arrived, the amount as an `Amount`, and how many invoices it covered. The table isn't selectable: nothing on this screen acts on the rows. Clicking a row opens a Sheet in the DataTable's `detail` slot, `row-to-sheet`, that lists the invoices that payment covered. The screen is read-only, with no actions.

The rows are the fixtures' `paymentsReceived`: bind the DataTable's rows to it, and its cells to each row's `dateLabel`, `amount` and `currency`, and `invoiceCountLabel`. Title the Sheet with the row's `dateLabel`, and in it bind the row's `amount` and `currency` to an Amount, then its `invoiceCountLabel` and its `invoicesLabel`, the covered invoices' numbers. When there are no payments, an EmptyState takes the DataTable's place.

| Screen state | Fixture | What shows |
|---|---|---|
| default | your payments (`default`) | the Heading and the DataTable, one row per payment and no checkboxes |
| `empty` | a new contractor (`payments-received/empty`) | the Heading and an EmptyState: "No payments yet", and that a payment shows up here once Northwind pays an invoice |

The open Sheet is not a screen state: it is the DataTable's own state while a row is open.
