# PageHeader actions at the start, under the title

PageHeader puts its `actions` at the end of the title's row (`justify-between`). The row wraps, so under a long title or on a phone the actions move under it, at the start. They don't sit under the title at every width.

## Why this is out of scope

The design brief says nothing about where page actions go, so PageHeader follows the common page-header layout: title at the start, the screen's actions at the end of the same row. The brief's references don't decide it; it cites Stripe for money and status in tables and Linear for motion. On desktop, where most admin screens have room beside a short title, the end of the row keeps the header to one line. Under the title at every width would add a row to every admin screen for the sake of a shared left edge.

On a phone the wrap already gives that edge: the actions drop under the title, at the start, where Card's footer puts its Button. Button leaves its width to the layout (`button-width.md`), so a wrapped action is label-width, not stretched.

## When to reconsider

When a lone primary action on a wide admin screen ends up far from the content it acts on, the same thing `button-width.md` watches for. invoice-queue's Approve and pay, beside a DataTable, is the first place it would show.

## Prior requests

- #176: "PageHeader gap: PageHeader puts its actions at the end of the row"
