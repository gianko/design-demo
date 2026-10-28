---
audience: contractor
requires:
  components:
    [Screen, Heading, DataTable, Sheet, Amount, StatusTag, Text, EmptyState]
  states: [empty]
  actions: []
  transitions: [row-to-sheet]
---

# My invoices

A contractor checks on the invoices they've sent. Title the `Screen` with a Heading, "My invoices", then show them in a DataTable, one row per invoice: its number, the amount as an `Amount`, the due date and its status as a `StatusTag`. Nothing acts on the rows, so the table isn't selectable. Clicking a row, or pressing Enter on it, opens that invoice's details in a `Sheet` in the DataTable's `detail` slot (`row-to-sheet`): a Heading with its number as the Sheet's title, the amount as an `Amount` and its status as a `StatusTag`, then only what the row doesn't show: a Text each for the description, the issued date, the client and the line count. The screen is read-only, with no actions.

The rows are the fixtures' `yourInvoices`: bind the DataTable's rows to it, its cells to each row's `number`, `amount` and `currency`, `dueLabel` and `status`, and the Sheet's nodes to the same row's `number`, `amount`, `currency`, `status`, `description`, `issuedLabel`, `client` and `lineCountLabel`. Keep "Issued " before the issued date and "Billed to " before the client as literal copy. In the `empty` state an `EmptyState` takes the DataTable's place.

| Screen state | Fixture | What shows |
|---|---|---|
| default | your invoices (`default`) | the Heading and the DataTable, one row per invoice and no checkboxes |
| `empty` | a new contractor (`my-invoices/empty`) | the Heading and an EmptyState: "No invoices yet", and that each invoice you send shows up here |

An open Sheet is not a screen state: it is the DataTable's own state while a row's details show.
