# Truncating or stacking DataTable cells

A DataTable cell never wraps and never truncates. A long value widens its column, and when the columns outgrow the screen the table scrolls sideways inside its surface. There is no column maximum width with an ellipsis, and no phone layout that stacks a row as a label–value list.

## Why this is out of scope

Keeping a cell on one line is what holds every row to the density's row height and keeps an amount from breaking across lines. Nothing is hidden: a truncated contractor name or invoice number would need a tooltip to read in full, and a tooltip is one more component. The one P0 table is on `invoice-queue`, an admin screen, used at a desk, so a narrow table is the exception. Both alternatives need decisions the design brief doesn't make: truncation needs a column width token, and a stacked phone layout needs a breakpoint, which `.out-of-scope/responsive-layout.md` already declined for Stack.

## When to reconsider

When a contractor screen gets a DataTable, since the contractor is often on a phone, or when a breakpoint token arrives for another reason.

## Prior requests

- #191: "DataTable gap: Cells stay on one line, and a narrow table scrolls sideways"
