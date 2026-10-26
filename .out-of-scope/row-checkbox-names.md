# Naming a row's Checkbox from more than its id

Each DataTable row's Checkbox is named "Select" and the row's `id`, such as "Select INV-0142"; the header's is "Select all rows". There is no `rowName` prop naming the field that says what a row is, and the box isn't labelled by the row's first cell.

## Why this is out of scope

An invoice's `id` is its number, so the name a screen reader reads is the same one the admin sees in the row. Invoices are the only rows any P0 table shows: `invoice-queue` is the one brief with a DataTable. A `rowName` prop would be one more prop for the spec step to fill in on every DataTable, to fix a name that already reads well. Labelling by the first cell (`aria-labelledby`) would need Checkbox to take a labelling id it has no other use for, and the first cell isn't always the one that identifies the row.

## When to reconsider

When a DataTable lists rows whose `id` isn't what a person calls them, such as payments or contractors, whose fixture ids are slugs like `priya-raman`.

## Prior requests

- #190: "DataTable gap: Row checkboxes are named from the row's id"
