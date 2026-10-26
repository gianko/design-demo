# PageHeader: gaps

Each entry is one place the brief, ADRs or tokens didn't decide something PageHeader needed, the call made, and the alternative a human might prefer.

## PageHeader's title is a Heading slot, not a string prop

**Undecided:** spec § Library widening gives PageHeader a "title", without saying whether that's copy or a node. Gate 1's heading checks (`generator/gate1.ts`, `headingChecks`) count only Heading nodes. If PageHeader rendered its own `<h1>` from a `title` string, gate 1 wouldn't see it: invoice-review's Card header Heading (level 2) would fail `heading-one` for having no level 1, and a spec step that added a level 1 Heading as well would put two `<h1>`s on the page.

**Call:** `title` is a registry slot allow-listed to Heading, and the `use` line asks for the screen's level 1 Heading there. PageHeader styles nothing in it.

**Alternative:** a required `title: string` prop that renders the `<h1>` with Heading's level 1 classes, which a UI spec can't get wrong, with gate 1 changed to count a PageHeader as a level 1 heading. Or keep the slot and have gate 1 check that a PageHeader's title holds a level 1 Heading.

## PageHeader has a description slot the spec doesn't name

**Undecided:** the spec names only a title and an `actions` slot, but payment-run asks for "the run's date in the PageHeader", and its fixture's `paymentRun.dateLabel` is just "Oct 24". A title bound to it would make the screen's `<h1>` read "Oct 24", and a single string prop can't join literal copy to a bound label.

**Call:** an optional `description` slot under the title, allow-listed to Text and Stack (a Stack row so "Runs" can sit before the bound "Oct 24"), 4px below the title. PageHeader doesn't style it; the Text sets its own tone.

**Alternative:** no description slot, with the date in the body under the PageHeader, or a `description` string prop that PageHeader renders muted, which fixes its look but can't hold a binding beside literal copy.

## PageHeader puts its actions at the end of the row

**Undecided:** the brief doesn't say where page actions go. Card's footer puts its Button at the start, and `.out-of-scope/button-width.md` leaves width to the layout.

**Call:** actions sit at the end of the title's row (`justify-between`), as page actions do in the brief's references (Stripe, Linear). The row wraps, so under a long title or on a phone they move under it, at the start.

**Alternative:** actions at the start, under the title, at every width. That keeps every action on the same left edge as the content, but the header grows a row on desktop, where most admin screens have room beside a short title.
