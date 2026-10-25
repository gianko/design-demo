# StatusTag: gaps

Each entry is one place the brief, ADRs or tokens didn't decide something StatusTag needed, the call made, and the alternative a human might prefer.

## No type role or height for a status tag

**Undecided:** the brief gives status tags a radius (4px) and colour pairs, but no type size or height. The type tokens have no tag role. Tags in dense status tables (the brief's Stripe reference) are usually 12px at 600, but the only 12px role, `caption`, is 400, and there are no standalone weight utilities (ADR 0005). The density table gives row and control heights, but nothing for an inline tag.

**Call:** `text-label` (14px admin, 16px contractor, 600), with no vertical padding, so the tag is exactly as tall as a line of body text (20px admin, 24px contractor) and sits on the line beside the invoice number. Horizontal padding is `px-2xs` (8px).

**Alternative:** a `tag` type role at 12px and 600 (fixed, or a density token like `label`), so a tag reads as smaller than the row's text, with `py-3xs` for some room above and below the word. Or `caption` at 400, which would be quieter but loses weight on a tint.

## The status words are the brief's single words, and the tag owns them

**Undecided:** the brief's status table names the five statuses (Awaiting, Overdue, Paid, Scheduled, Failed) as colour labels, not as the copy a tag shows. "Awaiting" on its own doesn't say what it's waiting for: the spec's `payment-run` brief calls it "awaiting approval". The brief also doesn't say whether a screen may write its own tag copy, such as "Paid Oct 20".

**Call:** StatusTag shows the brief's word for each status and takes no label prop. A screen passes only `status`, so the word and the colour can't disagree, and a bound status always renders its word.

**Alternative:** "Awaiting approval" for `awaiting` (two words, still short), or words per audience (an admin sees "Awaiting approval", a contractor "With client"). Or an optional `label` prop for copy that adds a date, at the cost of letting a generated screen put the wrong word on a colour.
