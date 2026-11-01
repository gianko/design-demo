# Brief conformance calibration

Written by `pnpm evals:calibrate` (ADR 0014) on 2026-11-01, at `974ae30`. The judge is claude-opus-5-5 at effort high, prompt `c4f8511492d8`. The calibration set's 10 screens, 4 kept screens as they are and 6 broken copies, have 37 screen states, and each was judged 3 times. It cost $2.81.

## Right verdicts and flips

A screen's verdict on a criterion in one run fails when any of its states fails it. It's right when a kept screen passes, and when a broken copy fails the criterion it breaks and passes the rest. A screen's criterion flipped when its verdicts differ between runs.

| Criterion | Right | Flipped |
| --- | --- | --- |
| hierarchy | 30/30 (100%) | 0/10 (0%) |
| density | 30/30 (100%) | 0/10 (0%) |
| accent | 30/30 (100%) | 0/10 (0%) |
| elevation | 30/30 (100%) | 0/10 (0%) |
| copy | 30/30 (100%) | 0/10 (0%) |
| repetition | 30/30 (100%) | 0/10 (0%) |
| **All** | 180/180 (100%) | 0/60 (0%) |

## bulk-pay

Kept, as it is.

States: default · empty · payment-scheduled · payment-failed · default, rows ticked.

| Criterion | Expected | Run 1 | Run 2 | Run 3 |
| --- | --- | --- | --- | --- |
| hierarchy | pass | pass | pass | pass |
| density | pass | pass | pass | pass |
| accent | pass | pass | pass | pass |
| elevation | pass | pass | pass | pass |
| copy | pass | pass | pass | pass |
| repetition | pass | pass | pass | pass |

- hierarchy · run 1 · pass · default: The "Pay invoices" title is set larger and heavier than the 600-weight muted column headers and regular-weight body rows, all in one sans face, so "hierarchy comes from size and weight, not from a second face."
- hierarchy · run 2 · pass · default: The "Pay invoices" title is set apart by larger size and 600 weight in the same sans as the table, consistent with "hierarchy comes from size and weight, not from a second face."
- hierarchy · run 3 · pass · default: The "Pay invoices" title and the table headers stand apart through larger size and heavier weight in the same sans family, so "hierarchy comes from size and weight, not from a second face."
- density · run 1 · pass · default: Rows sit at about 46px with 14px text and tight page padding, matching "Admin screens are dense."
- density · run 2 · pass · default: The admin table uses compact rows of about 46px, 14px text and 28px page padding, matching "Admin screens are dense."
- density · run 3 · pass · default: Rows of about 46px, 14px body text and a compact footer button suit the admin, matching "Admin screens are dense."
- accent · run 1 · pass · default: No heather appears decoratively: the disabled "Pay selected" button sits in a flat neutral and the status tags use amber, consistent with "a dusty berry for primary actions, selection and focus only."
- accent · run 2 · pass · default: No accent appears: nothing is selected and "Pay selected" is shown in a neutral disabled fill, so berry isn't misused beyond "a dusty berry for primary actions, selection and focus only."
- accent · run 3 · pass · default: No heather appears on the neutral headers, unticked checkboxes or the disabled grey "Pay selected" button, which keeps the accent to "a dusty berry for primary actions, selection and focus only."
- elevation · run 1 · pass · default: The table frame is separated from the page by a hairline with no shadow, respecting "A shadow means "this floats", never "this is a box"."
- elevation · run 2 · pass · default: The table frame sits flat on the page with a hairline border and no shadow, honouring "A shadow means "this floats", never "this is a box"."
- elevation · run 3 · pass · default: The table frame is set off by a hairline border with no shadow, consistent with "A shadow means "this floats", never "this is a box"."
- copy · run 1 · pass · default: The screen adds no wording beyond the brief-given "Pay invoices", "Pay selected" and "No invoices selected" and its column headers, and shows no error, so nothing breaks "Copy is second person, active and specific".
- copy · run 2 · pass · default: The only words the screen adds are the plain column headers (Invoice, Contractor, Amount, Due, Status), and there is no error to judge, so nothing breaks "Copy is second person, active and specific".
- copy · run 3 · pass · default: The only copy is the brief-supplied "Pay invoices", "No invoices selected" and "Pay selected" plus the column headers, and no error is shown, so nothing breaks "Copy is second person, active and specific".
- repetition · run 1 · pass · default: Each row states its status once in the "Awaiting" tag, with no echo in other cells, satisfying "Say a thing once: a card doesn't repeat "Overdue" in its title, its tag and its text."
- repetition · run 2 · pass · default: Each row states its status once, in the "Awaiting" tag only, in line with "Say a thing once: a card doesn't repeat "Overdue" in its title, its tag and its text."
- repetition · run 3 · pass · default: Each row states its status once, in the "Awaiting" tag, with no echo elsewhere in the row, honouring "Say a thing once: a card doesn't repeat "Overdue" in its title, its tag and its text."

## my-invoices

Kept, as it is.

States: default · empty · default, sheet open.

| Criterion | Expected | Run 1 | Run 2 | Run 3 |
| --- | --- | --- | --- | --- |
| hierarchy | pass | pass | pass | pass |
| density | pass | pass | pass | pass |
| accent | pass | pass | pass | pass |
| elevation | pass | pass | pass | pass |
| copy | pass | pass | pass | pass |
| repetition | pass | pass | pass | pass |

- hierarchy · run 1 · pass · default: The "My invoices" title stands out by being larger and semibold, and the column headers use weight and a muted colour at body size, all in one family, so "hierarchy comes from size and weight, not from a second face".
- hierarchy · run 2 · pass · default: The "My invoices" title stands apart from the table by being larger and heavier in the same sans as the rows and headers, so "hierarchy comes from size and weight, not from a second face."
- hierarchy · run 3 · pass · default: The 24px semibold "My invoices" title and the semibold muted column headers set themselves apart from the regular-weight rows in a single sans family, so "hierarchy comes from size and weight, not from a second face."
- density · run 1 · pass · default: The contractor table has roughly 60px rows, about 16px body text and a 36px page inset, which fits "Contractor screens have room."
- density · run 2 · pass · default: For the contractor, the 36px page padding, roughly 60px rows and comfortable body text give the table the room the brief asks for in "Contractor screens have room."
- density · run 3 · pass · default: This contractor table has roughly 60px rows, 16px body text and about 36px page padding, which matches "Contractor screens have room."
- accent · run 1 · pass · default: No heather appears anywhere; the only colour is in the red and blue status tags, which leaves the accent reserved for "a dusty berry for primary actions, selection and focus only."
- accent · run 2 · pass · default: No heather appears anywhere on this read-only table, and the status tags use their own red and blue, so nothing misuses "a dusty berry for primary actions, selection and focus only."
- accent · run 3 · pass · default: No heather appears anywhere on this read-only screen; the only colour is in the red and blue status tags, so nothing breaks "a dusty berry for primary actions, selection and focus only."
- elevation · run 1 · pass · default: The table frame sits flat with a hairline border and no shadow, consistent with "A shadow means "this floats", never "this is a box"."
- elevation · run 2 · pass · default: The table frame sits flat on the page, separated by a hairline with no shadow, which respects "A shadow means "this floats", never "this is a box"."
- elevation · run 3 · pass · default: The table frame sits flat on the page, edged by a hairline with no shadow, which keeps to "A shadow means "this floats", never "this is a box"."
- copy · run 1 · pass · default: The only words are the brief's title and the fixture data, and there is no error to judge, so nothing the screen adds breaks "Copy is second person, active and specific".
- copy · run 2 · pass · default: The only words the screen adds are the plain column headers "Invoice", "Amount", "Due" and "Status", and no error shows, so nothing breaks "Copy is second person, active and specific".
- copy · run 3 · pass · default: The only words the screen adds are the plain column headers "Invoice", "Amount", "Due" and "Status", and no error shows, so nothing breaks "Copy is second person, active and specific".
- repetition · run 1 · pass · default: Each row states its status once, in its tag, so the screen follows "Say a thing once: a card doesn't repeat "Overdue" in its title, its tag and its text."
- repetition · run 2 · pass · default: Each row gives its status once, in its tag ("Overdue", "Scheduled"), and no other cell repeats it, honouring "Say a thing once: a card doesn't repeat "Overdue" in its title, its tag and its text."
- repetition · run 3 · pass · default: Each row states its status once, in its tag, with no echo elsewhere in the row, which meets "Say a thing once: a card doesn't repeat "Overdue" in its title, its tag and its text."

## payment-run

Kept, as it is.

States: default · empty.

| Criterion | Expected | Run 1 | Run 2 | Run 3 |
| --- | --- | --- | --- | --- |
| hierarchy | pass | pass | pass | pass |
| density | pass | pass | pass | pass |
| accent | pass | pass | pass | pass |
| elevation | pass | pass | pass | pass |
| copy | pass | pass | pass | pass |
| repetition | pass | pass | pass | pass |

- hierarchy · run 1 · pass · default: The title, card titles, large amounts and muted counts all use one sans family, with differences in size and weight only, so "hierarchy comes from size and weight, not from a second face."
- hierarchy · run 2 · pass · default: The title, card headings, large amounts and muted counts are all one sans family, set apart only by size and weight, so "hierarchy comes from size and weight, not from a second face."
- hierarchy · run 3 · pass · default: The page title, card titles, large amounts and muted counts are all set apart by size and weight in one sans family, so "hierarchy comes from size and weight, not from a second face."
- density · run 1 · pass · default: This admin screen uses tight page padding, compact cards and small body text, which fits "Admin screens are dense."
- density · run 2 · pass · default: The admin screen uses tight page padding, compact cards and small type, matching "Admin screens are dense."
- density · run 3 · pass · default: The admin screen uses compact card padding, tight spacing and small body text, consistent with "Admin screens are dense."
- accent · run 1 · pass · default: The read-only screen shows no heather anywhere, since nothing is an action, selection or focus, so nothing breaks "a dusty berry for primary actions, selection and focus only."
- accent · run 2 · pass · default: This read-only screen shows no heather anywhere, and the only colour is in the status tags, so nothing breaks "a dusty berry for primary actions, selection and focus only."
- accent · run 3 · pass · default: The screen is read-only and uses no heather anywhere, so nothing breaks "a dusty berry for primary actions, selection and focus only."
- elevation · run 1 · pass · default: The cards sit flat on the page, separated by hairline borders with no shadow, in keeping with "A shadow means "this floats", never "this is a box"."
- elevation · run 2 · pass · default: The cards sit flat on the page, separated by a hairline border with no shadow, which honours "A shadow means "this floats", never "this is a box"."
- elevation · run 3 · pass · default: The cards are flat and separated by hairline borders with no shadow, honouring "A shadow means "this floats", never "this is a box"."
- copy · run 1 · pass · default: The only words the screen adds are the bound date and count labels like "2 invoices", and there is no error to judge against "Errors say what happened and what to do next."
- copy · run 2 · pass · default: The only words the screen adds are counts like "2 invoices" and the date "Oct 24", which are specific, and there is no error to judge against "Errors say what happened and what to do next."
- copy · run 3 · pass · default: The only copy the screen adds is plain counts like "2 invoices" and the date, with no errors, so nothing breaks "Copy is second person, active and specific".
- repetition · run 1 · pass · default: The Overdue card's title and tag both read "Overdue", but the screen brief fixes both the card title and the status tag's word, so the screen adds no repetition against "Say a thing once: a card doesn't repeat "Overdue" in its title, its tag and its text."
- repetition · run 2 · pass · default: The Overdue card's title and its tag both say "Overdue", but the screen brief fixes both, and the screen adds only "2 invoices", so it does not itself break "Say a thing once: a card doesn't repeat "Overdue" in its title, its tag and its text."
- repetition · run 3 · pass · default: The repeated word "Overdue" in the title and tag comes from the screen brief's fixed card title and per-status tag word, and the screen's own count text adds no repetition, so it meets "Say a thing once: a card doesn't repeat "Overdue" in its title, its tag and its text."

## payment-status

Kept, as it is.

States: default · empty · reminder-sent · reminder-failed.

| Criterion | Expected | Run 1 | Run 2 | Run 3 |
| --- | --- | --- | --- | --- |
| hierarchy | pass | pass | pass | pass |
| density | pass | pass | pass | pass |
| accent | pass | pass | pass | pass |
| elevation | pass | pass | pass | pass |
| copy | pass | pass | pass | pass |
| repetition | pass | pass | pass | pass |

- hierarchy · run 1 · pass · default: One sans family carries everything, with the 600-weight "Payment status" title and the large amount set apart from the regular-weight due date and client line, so "hierarchy comes from size and weight, not from a second face."
- hierarchy · run 2 · pass · default: One sans family carries the title, the large "$4,800.00" figure and the body, with hierarchy set by size and weight, so "hierarchy comes from size and weight, not from a second face" holds.
- hierarchy · run 3 · pass · default: One sans family carries the screen, and only size and weight set the page title, the large 600-weight "$4,800.00" figure and the muted client line apart, so "hierarchy comes from size and weight, not from a second face."
- density · run 1 · pass · default: The contractor card has generous page padding, roughly 16px body text and a full-width button about 44px tall with open spacing between lines, matching "Contractor screens have room."
- density · run 2 · pass · default: The 36px page padding, the roughly 44px-tall full-width button, the 16px-ish body text and the airy card spacing fit "Contractor screens have room."
- density · run 3 · pass · default: This contractor screen has a roughly 36px page inset, a full-height 44px button and generous gaps between card lines, in line with "Contractor screens have room."
- accent · run 1 · pass · default: Heather is used only on the primary "Send reminder" button, while the Overdue tag uses its own red, in keeping with "a dusty berry for primary actions, selection and focus only."
- accent · run 2 · pass · default: Heather appears only as the fill of the primary "Send reminder" button, and the status tag uses its own red, matching "a dusty berry for primary actions, selection and focus only."
- accent · run 3 · pass · default: The heather fill appears only on the primary "Send reminder" button, and the Overdue tag uses its own red, which fits "a dusty berry for primary actions, selection and focus only."
- elevation · run 1 · pass · default: The card sits flat on the page, separated by a hairline border with no shadow, which respects "A shadow means "this floats", never "this is a box"."
- elevation · run 2 · pass · default: The card sits flat on the page with a hairline border and no shadow, consistent with "A shadow means "this floats", never "this is a box"."
- elevation · run 3 · pass · default: The card sits flat on the page with a hairline border and no shadow, respecting "A shadow means "this floats", never "this is a box"."
- copy · run 1 · pass · default: The screen adds no words beyond the brief's own (the title, "Due " before the date and the "Send reminder" action) and shows no error, so it does not break "Copy is second person, active and specific".
- copy · run 2 · pass · default: The screen adds no copy beyond the brief's title, the bound fixture fields, the literal "Due " and "Send reminder", and it shows no error, so "Copy is second person, active and specific" has nothing added to fault.
- copy · run 3 · pass · default: The only copy the screen adds beyond the brief's fixed text is the bound fixture data and the literal "Due ", and no error appears, so nothing breaks "Copy is second person, active and specific".
- repetition · run 1 · pass · default: "Overdue" appears only in the status tag, not in the title or the due line, honouring "Say a thing once: a card doesn't repeat "Overdue" in its title, its tag and its text."
- repetition · run 2 · pass · default: "Overdue" appears only in the status tag, not in the title or body text, so the card follows "Say a thing once: a card doesn't repeat "Overdue" in its title, its tag and its text."
- repetition · run 3 · pass · default: "Overdue" appears only in the status tag, not in the title or the body, honouring "Say a thing once: a card doesn't repeat "Overdue" in its title, its tag and its text."

## payment-status--accent

Breaks accent: A second primary Button, Download invoice, beside Send reminder.

States: default · empty · reminder-sent · reminder-failed.

| Criterion | Expected | Run 1 | Run 2 | Run 3 |
| --- | --- | --- | --- | --- |
| hierarchy | pass | pass | pass | pass |
| density | pass | pass | pass | pass |
| accent | fail | fail | fail | fail |
| elevation | pass | pass | pass | pass |
| copy | pass | pass | pass | pass |
| repetition | pass | pass | pass | pass |

- hierarchy · run 1 · pass · default: The screen uses one sans family throughout, with the title, the large "$4,800.00" figure and the invoice number set apart by size and weight, so "hierarchy comes from size and weight, not from a second face."
- hierarchy · run 2 · pass · default: One sans family carries everything, with the 'Payment status' title and the '$4,800.00' figure set apart by size and weight, so "hierarchy comes from size and weight, not from a second face."
- hierarchy · run 3 · pass · default: One sans family carries everything, with the 'Payment status' title, the large '$4,800.00' figure and the semibold invoice number set apart from the regular body lines, so "hierarchy comes from size and weight, not from a second face."
- density · run 1 · pass · default: For this contractor screen, the 36px page padding, roughly 16px body text, 44px-tall buttons and generous card spacing give the room the brief asks for: "Contractor screens have room."
- density · run 2 · pass · default: This contractor screen uses roughly 36px page padding, 44px-tall buttons and 16px body text, matching "Contractor screens have room."
- density · run 3 · pass · default: This contractor screen has generous page padding, roomy card spacing, 16px body text and controls about 44px tall, matching "Contractor screens have room."
- accent · run 1 · fail · default: Both "Send reminder" and the secondary "Download invoice" are filled with heather, so the accent sits on a non-primary action and no longer marks the one primary action, against "a dusty berry for primary actions, selection and focus only."
- accent · run 1 · fail · reminder-failed: Both "Send reminder" and the screen's own "Download invoice" get the same filled heather treatment, so a secondary action takes the accent, breaking "a dusty berry for primary actions, selection and focus only."
- accent · run 2 · fail · default: Both 'Send reminder' and the secondary 'Download invoice' are filled heather, so the accent is no longer reserved for "a dusty berry for primary actions, selection and focus only." and the one primary action stops standing out.
- accent · run 2 · fail · reminder-failed: Both "Send reminder" and the added secondary "Download invoice" are filled heather buttons, so the accent is spent on a non-primary action and no longer marks "a dusty berry for primary actions, selection and focus only."
- accent · run 3 · fail · default: Both 'Send reminder' and the added 'Download invoice' are filled in heather, so a secondary action takes the accent and two buttons compete as primary, against "a dusty berry for primary actions, selection and focus only."
- accent · run 3 · fail · reminder-failed: Both "Send reminder" and the secondary "Download invoice" are filled heather buttons, which spends the accent on a non-primary action when it is meant to be "a dusty berry for primary actions, selection and focus only."
- elevation · run 1 · pass · default: The card sits flat on the page, edged by a hairline rather than a shadow, which honours "A shadow means "this floats", never "this is a box"."
- elevation · run 2 · pass · default: The card sits flat on the page with a hairline edge and no shadow, consistent with "A shadow means "this floats", never "this is a box"."
- elevation · run 3 · pass · default: The card sits flat on the page with only a hairline border and no shadow, consistent with "A shadow means "this floats", never "this is a box"."
- copy · run 1 · pass · default: The screen's own button labels, "Send reminder" and "Download invoice", are active and specific, and there is no error copy here to judge, so it meets "Copy is second person, active and specific".
- copy · run 2 · pass · default: The added button labels 'Send reminder' and 'Download invoice' are active and specific, and the screen shows no error to judge, so it meets "Copy is second person, active and specific".
- copy · run 3 · pass · default: The only copy the screen adds is the button label 'Download invoice', which is active and specific, meeting "Copy is second person, active and specific"; this state shows no error to judge.
- repetition · run 1 · pass · default: "Overdue" appears only in the status tag, not in the title or the supporting text, so the card follows "Say a thing once: a card doesn't repeat "Overdue" in its title, its tag and its text."
- repetition · run 2 · pass · default: 'Overdue' appears only in the status tag, not in the title or the body text, so the card follows "Say a thing once: a card doesn't repeat "Overdue" in its title, its tag and its text."
- repetition · run 3 · pass · default: 'Overdue' appears only in the status tag, not in the title or body text, honouring "Say a thing once: a card doesn't repeat "Overdue" in its title, its tag and its text."

## payment-status--elevation

Breaks elevation: The invoice's Card sits on a raised shadow.

States: default · empty · reminder-sent · reminder-failed.

| Criterion | Expected | Run 1 | Run 2 | Run 3 |
| --- | --- | --- | --- | --- |
| hierarchy | pass | pass | pass | pass |
| density | pass | pass | pass | pass |
| accent | pass | pass | pass | pass |
| elevation | fail | fail | fail | fail |
| copy | pass | pass | pass | pass |
| repetition | pass | pass | pass | pass |

- hierarchy · run 1 · pass · default: The title, amount, invoice number and meta lines share one sans family and are set apart by size and weight, so "hierarchy comes from size and weight, not from a second face."
- hierarchy · run 2 · pass · default: The title, the large $4,800.00 figure and the body lines all use one sans family, separated only by size and weight, as in "hierarchy comes from size and weight, not from a second face."
- hierarchy · run 3 · pass · default: One sans family carries everything, with the title and "$4,800.00" set apart only by larger size and heavier weight, so "hierarchy comes from size and weight, not from a second face."
- density · run 1 · pass · default: This contractor card has generous page padding, 16px body text and a tall full-width button, which fits "Contractor screens have room."
- density · run 2 · pass · default: This contractor card has generous page padding, a tall full-width button and roomy spacing between lines, matching "Contractor screens have room."
- density · run 3 · pass · default: This contractor screen has generous page padding, a full-height 44px button and roomy spacing between the amount, due date and client lines, as "Contractor screens have room." asks.
- accent · run 1 · pass · default: Heather appears only on the primary Send reminder button, and the Overdue tag uses its own red, matching "a dusty berry for primary actions, selection and focus only."
- accent · run 2 · pass · default: The berry fill appears only on the primary Send reminder button, while the Overdue tag uses its own red, keeping heather to "a dusty berry for primary actions, selection and focus only."
- accent · run 3 · pass · default: Heather fills only the primary Send reminder button, and the Overdue tag uses its own red, keeping the accent to "a dusty berry for primary actions, selection and focus only."
- elevation · run 1 · fail · default: The static invoice card sits flat on the page but carries a soft drop shadow on top of its hairline border, which breaks "A shadow means "this floats", never "this is a box"."
- elevation · run 1 · fail · reminder-sent: The flat invoice card, which already has a hairline border, also casts a soft drop shadow along its bottom edge, which uses a shadow to mean box rather than float, against "A shadow means "this floats", never "this is a box"."
- elevation · run 1 · fail · reminder-failed: The card already has a hairline border but also casts a soft drop shadow at its bottom edge, even though it sits flat in the page and doesn't float, which breaks "A shadow means "this floats", never "this is a box"."
- elevation · run 2 · fail · default: The flat invoice card sits in the page yet carries a soft drop shadow under its hairline edge, using shadow to frame a box, against "A shadow means \"this floats\", never \"this is a box\"."
- elevation · run 2 · fail · reminder-sent: The invoice card sits flat on the page yet appears to carry a soft drop shadow beneath its hairline border, which uses a shadow to mark a box rather than floating content, against "A shadow means "this floats", never "this is a box"."
- elevation · run 2 · fail · reminder-failed: The card is an in-page container with a hairline border, yet it also casts a soft shadow along its bottom edge, which breaks "A shadow means "this floats", never "this is a box"."
- elevation · run 3 · fail · default: The static invoice card sits on the page with a soft drop shadow under its hairline border, using shadow to frame a box when "A shadow means "this floats", never "this is a box"."
- elevation · run 3 · fail · reminder-sent: The invoice card is a flat card on the page, yet it seems to sit on a soft drop shadow along its bottom edge as well as its hairline, which breaks "A shadow means "this floats", never "this is a box"."
- elevation · run 3 · fail · reminder-failed: The invoice card is static content sitting on the page, yet it carries a soft drop shadow under its hairline border, which uses a shadow to mark a box and breaks "A shadow means "this floats", never "this is a box"."
- copy · run 1 · pass · default: The only words the screen adds are the invoice details, and no error is shown, so nothing breaks "Copy is second person, active and specific".
- copy · run 2 · pass · default: The only words the screen adds, the "Payment status" title and the "Send reminder" label, are plain and specific, and there is no error here to judge, consistent with "Copy is second person, active and specific".
- copy · run 3 · pass · default: The screen adds no copy beyond the brief's fixed title, "Due ", bound fixture values and the Send reminder label, and it shows no error, so nothing breaks "Copy is second person, active and specific".
- repetition · run 1 · pass · default: "Overdue" appears only in the status tag, not in the title or the body text, honouring "Say a thing once: a card doesn't repeat "Overdue" in its title, its tag and its text."
- repetition · run 2 · pass · default: "Overdue" appears only in the status tag, not in the title or the due line, honouring "Say a thing once: a card doesn't repeat \"Overdue\" in its title, its tag and its text."
- repetition · run 3 · pass · default: "Overdue" appears only in the status tag, not in the invoice number title or the supporting text, honouring "Say a thing once: a card doesn't repeat "Overdue" in its title, its tag and its text."

## bulk-pay--copy

Breaks copy: The title says Streamline your payroll, not Pay invoices.

States: default · empty · payment-scheduled · payment-failed · default, rows ticked.

| Criterion | Expected | Run 1 | Run 2 | Run 3 |
| --- | --- | --- | --- | --- |
| hierarchy | pass | pass | pass | pass |
| density | pass | pass | pass | pass |
| accent | pass | pass | pass | pass |
| elevation | pass | pass | pass | pass |
| copy | fail | fail | fail | fail |
| repetition | pass | pass | pass | pass |

- hierarchy · run 1 · pass · default: The title is set larger and heavier than the table text in the same sans family, so "hierarchy comes from size and weight, not from a second face" holds.
- hierarchy · run 2 · pass · default: The 600-weight title and the 600 muted headers are set apart from regular-weight rows within one sans family, so "hierarchy comes from size and weight, not from a second face."
- hierarchy · run 3 · pass · default: The bold, larger title and the 600-weight muted column headers set levels in a single family, so "hierarchy comes from size and weight, not from a second face."
- density · run 1 · pass · default: Rows are about 46px with 14px text and tight padding, matching "Admin screens are dense."
- density · run 2 · pass · default: Rows sit at about 46px with 14px text and tight padding, fitting "Admin screens are dense."
- density · run 3 · pass · default: Rows sit at about 46px with 14px text and tight padding, matching "Admin screens are dense."
- accent · run 1 · pass · default: No heather is spent on decoration: the disabled Pay selected button is a flat neutral and the status tags use amber, consistent with "a dusty berry for primary actions, selection and focus only."
- accent · run 2 · pass · default: No heather appears; the disabled Pay selected button is a flat neutral and the status tags use amber, consistent with "a dusty berry for primary actions, selection and focus only."
- accent · run 3 · pass · default: No heather appears on decoration; the disabled "Pay selected" button is a flat neutral and nothing is selected, consistent with "a dusty berry for primary actions, selection and focus only."
- elevation · run 1 · pass · default: The table frame is separated by a hairline with no drop shadow, respecting "A shadow means "this floats", never "this is a box"."
- elevation · run 2 · pass · default: The table frame is flat with a hairline border and no shadow, honouring "A shadow means "this floats", never "this is a box"."
- elevation · run 3 · pass · default: The table is separated from the page by a hairline border with no shadow, respecting "A shadow means "this floats", never "this is a box"."
- copy · run 1 · fail · default: The screen replaces the brief's "Pay invoices" title with the vague, marketing-style "Streamline your payroll", which breaks "Copy is second person, active and specific".
- copy · run 1 · fail · empty: The screen replaces the brief's "Pay invoices" header with its own vague marketing line, "Streamline your payroll", which breaks "Copy is second person, active and specific".
- copy · run 1 · fail · payment-scheduled: The screen replaces the brief's title "Pay invoices" with the vague marketing line "Streamline your payroll", which says nothing about the task on this page and breaks "Copy is second person, active and specific".
- copy · run 1 · fail · payment-failed: The toast's error copy is good, but the screen replaced the brief's "Pay invoices" title with the vague marketing line "Streamline your payroll", which breaks "Copy is second person, active and specific".
- copy · run 1 · fail · default, rows ticked: The screen replaces the brief's "Pay invoices" title with "Streamline your payroll", vague marketing copy that breaks "Copy is second person, active and specific".
- copy · run 2 · fail · default: The screen replaces the brief's "Pay invoices" title with the vague marketing line "Streamline your payroll", which breaks "Copy is second person, active and specific".
- copy · run 2 · fail · empty: The screen replaces the brief's "Pay invoices" title with its own vague, marketing-style "Streamline your payroll", which says nothing about what the admin can do here and so breaks "Copy is second person, active and specific".
- copy · run 2 · fail · payment-scheduled: The screen adds the page title "Streamline your payroll" in place of the brief's "Pay invoices"; it is a vague marketing slogan, not "Copy is second person, active and specific".
- copy · run 2 · fail · payment-failed: The toast's error copy is good, but the screen replaces the brief's "Pay invoices" title with the vague marketing line "Streamline your payroll", which breaks "Copy is second person, active and specific".
- copy · run 2 · fail · default, rows ticked: The screen replaces the brief's title "Pay invoices" with the vague marketing line "Streamline your payroll", which breaks "Copy is second person, active and specific".
- copy · run 3 · fail · default: The screen replaces the brief's title "Pay invoices" with the vague marketing line "Streamline your payroll", which breaks "Copy is second person, active and specific".
- copy · run 3 · fail · empty: The screen replaces the brief's "Pay invoices" title with the vague marketing line "Streamline your payroll", which is not specific about what the admin does here, breaking "Copy is second person, active and specific".
- copy · run 3 · fail · payment-scheduled: The screen replaces the brief's title "Pay invoices" with the vague marketing line "Streamline your payroll", which breaks "Copy is second person, active and specific".
- copy · run 3 · fail · payment-failed: The toast's error copy is good, but the screen swaps the brief's "Pay invoices" title for the vague marketing line "Streamline your payroll", which breaks "Copy is second person, active and specific".
- copy · run 3 · fail · default, rows ticked: The screen replaces the brief's title "Pay invoices" with the vague marketing line "Streamline your payroll", which breaks "Copy is second person, active and specific".
- repetition · run 1 · pass · default: Each row states its status only once, in its Awaiting tag, so "Say a thing once: a card doesn't repeat "Overdue" in its title, its tag and its text." holds.
- repetition · run 2 · pass · default: Each row states its status only once, in its tag, meeting "Say a thing once: a card doesn't repeat "Overdue" in its title, its tag and its text."
- repetition · run 3 · pass · default: Each row states its status once in its tag, with no echo in other cells, honouring "Say a thing once: a card doesn't repeat "Overdue" in its title, its tag and its text."

## bulk-pay--density

Breaks density: The admin screen's Screen sets the contractor's density.

States: default · empty · payment-scheduled · payment-failed · default, rows ticked.

| Criterion | Expected | Run 1 | Run 2 | Run 3 |
| --- | --- | --- | --- | --- |
| hierarchy | pass | pass | pass | pass |
| density | fail | fail | fail | fail |
| accent | pass | pass | pass | pass |
| elevation | pass | pass | pass | pass |
| copy | pass | pass | pass | pass |
| repetition | pass | pass | pass | pass |

- hierarchy · run 1 · pass · default: The "Pay invoices" title stands apart from the body through larger size and heavier weight in the same sans family, with no second face, so "hierarchy comes from size and weight, not from a second face."
- hierarchy · run 2 · pass · default: The "Pay invoices" title stands apart through larger size and semibold weight in the same sans as the table, with headers set off by weight and muted colour, so "hierarchy comes from size and weight, not from a second face."
- hierarchy · run 3 · pass · default: The 'Pay invoices' title is set larger and heavier than the 600-weight muted column headers and the regular body rows, all in one sans family, so "hierarchy comes from size and weight, not from a second face."
- density · run 1 · fail · default: This admin screen uses contractor spacing: rows about 60px tall, a 44px-high Pay selected button and 36px page padding, so it breaks "Admin screens are dense."
- density · run 1 · fail · empty: On an admin screen the page padding measures about 36px and the empty-state body reads at about 16px, which are the contractor's full-room values, so it breaks "Admin screens are dense."
- density · run 1 · fail · payment-scheduled: This admin screen has rows about 60px tall, a roughly 44px-high Pay selected button, body text near 16px and about 36px page padding, which is the contractor's full-room spacing rather than the brief's "Admin screens are dense."
- density · run 1 · fail · payment-failed: This admin screen uses contractor measurements: rows about 60px tall, a 44px "Pay selected" button, roughly 16px body text and 36px page padding, which breaks "Admin screens are dense."
- density · run 1 · fail · default, rows ticked: This admin screen uses rows about 60px tall, roughly 16px text and 36px page padding, which are the contractor values, so it ignores "Admin screens are dense."
- density · run 2 · fail · default: This admin screen uses roomy contractor measurements: rows about 60px tall, a footer button about 44px tall and about 36px page padding. That breaks "Admin screens are dense."
- density · run 2 · fail · empty: This admin screen uses roomy contractor-scale spacing, with 36px page padding, body text near 16px and a softly rounded card, so it breaks "Admin screens are dense."
- density · run 2 · fail · payment-scheduled: This admin table uses about 60px rows and about 36px page padding, the contractor's full-room values rather than the 46px rows and 28px padding the brief sets for admins, which breaks "Admin screens are dense."
- density · run 2 · fail · payment-failed: This admin screen uses contractor sizing: rows and the header are about 60px tall, the Pay selected button is about 44px high, page padding is about 36px and text is near 16px, which breaks "Admin screens are dense."
- density · run 2 · fail · default, rows ticked: Although this is the admin's screen, its rows and header measure about 60px, its button about 44px, its page padding about 36px and its body text looks about 16px, which is contractor sizing and breaks "Admin screens are dense."
- density · run 3 · fail · default: This admin table uses about 60px rows and 36px page padding, which are the contractor values, so it breaks "Admin screens are dense."
- density · run 3 · fail · empty: This admin screen uses about 36px page padding and roughly 16px body text, the contractor's full-room values, which breaks "Admin screens are dense."
- density · run 3 · fail · payment-scheduled: This admin screen uses roomy measurements: rows about 60px tall, a 44px Pay selected button and 36px page padding, all contractor values, which breaks "Admin screens are dense."
- density · run 3 · fail · payment-failed: This admin screen uses rows about 60px tall, a 44px Pay selected button, 16px-looking body text and 36px page padding, which is the contractor's full-room spacing even though "Admin screens are dense."
- density · run 3 · fail · default, rows ticked: This admin screen uses contractor sizing, breaking "Admin screens are dense.": rows and the header row are about 60px rather than 46px, the Pay selected button is about 44px tall, body text looks about 16px, and the page padding is about 36px.
- accent · run 1 · pass · default: No heather appears on the screen: the disabled Pay selected button is a flat neutral and nothing is selected or focused, so nothing goes against "a dusty berry for primary actions, selection and focus only."
- accent · run 2 · pass · default: No heather appears anywhere: the disabled "Pay selected" button is a flat neutral and nothing is selected or focused, which is consistent with "a dusty berry for primary actions, selection and focus only."
- accent · run 3 · pass · default: No heather appears anywhere: the disabled 'Pay selected' button has a flat neutral fill and nothing is selected or focused, which is consistent with "a dusty berry for primary actions, selection and focus only."
- elevation · run 1 · pass · default: The table sits flat on the page, set off by a hairline border with no shadow, which fits "A shadow means "this floats", never "this is a box"."
- elevation · run 2 · pass · default: The table card sits flat on the page with a hairline border and no shadow, consistent with "A shadow means "this floats", never "this is a box"."
- elevation · run 3 · pass · default: The table sits flat on the page, framed by a hairline with no drop shadow, honouring "A shadow means "this floats", never "this is a box"."
- copy · run 1 · pass · default: The only visible copy is the brief's own ("Pay invoices", "No invoices selected", "Pay selected") plus column headers, and no error shows, so nothing breaks "Copy is second person, active and specific".
- copy · run 2 · pass · default: The only copy visible is the brief's own "Pay invoices", "No invoices selected" and "Pay selected", plus plain column headers, so nothing added breaks "Copy is second person, active and specific".
- copy · run 3 · pass · default: The only copy beyond headers and data is the brief's own 'No invoices selected' and 'Pay selected', and there is no error to judge against "Errors say what happened and what to do next."
- repetition · run 1 · pass · default: Each row states its status once, in its "Awaiting" tag, without echoing it elsewhere in the row, which fits "Say a thing once: a card doesn't repeat "Overdue" in its title, its tag and its text."
- repetition · run 2 · pass · default: Each row states its status only once, in the "Awaiting" tag, honouring "Say a thing once: a card doesn't repeat "Overdue" in its title, its tag and its text."
- repetition · run 3 · pass · default: Each row states its status once, in its 'Awaiting' tag, without echoing it elsewhere in the row, meeting "Say a thing once: a card doesn't repeat "Overdue" in its title, its tag and its text."

## my-invoices--hierarchy

Breaks hierarchy: The title is muted body Text, not a level-1 Heading.

States: default · empty · default, sheet open.

| Criterion | Expected | Run 1 | Run 2 | Run 3 |
| --- | --- | --- | --- | --- |
| hierarchy | fail | fail | fail | fail |
| density | pass | pass | pass | pass |
| accent | pass | pass | pass | pass |
| elevation | pass | pass | pass | pass |
| copy | pass | pass | pass | pass |
| repetition | pass | pass | pass | pass |

- hierarchy · run 1 · fail · default: The "My invoices" Heading renders as small, light, muted text, smaller and lighter than the 600-weight column headers below it, so the page title doesn't lead, against "hierarchy comes from size and weight, not from a second face."
- hierarchy · run 1 · fail · empty: The "My invoices" page heading renders small, regular-weight and muted, visibly weaker than the bold "No invoices yet" card title beneath it, so the page title doesn't lead even though "hierarchy comes from size and weight, not from a second face."
- hierarchy · run 1 · fail · default, sheet open: The single face holds, but the screen's "My invoices" Heading renders as small, regular-weight muted text, lighter than the 600-weight table headers beneath it, so the page title gets no rank from size or weight, against "hierarchy comes from size and weight, not from a second face."
- hierarchy · run 2 · fail · default: The "My invoices" heading renders as small, muted, regular-weight text that reads weaker than the 600-weight table headers, so the title gets no rank from "hierarchy comes from size and weight, not from a second face."
- hierarchy · run 2 · fail · empty: The page Heading "My invoices" renders small, regular weight and muted, visually weaker than the bold "No invoices yet" below it, so the title fails the rule that "hierarchy comes from size and weight, not from a second face" and the brief's "Titles (24px and up) and a single large figure use 600".
- hierarchy · run 2 · fail · default, sheet open: The sheet reads well, with a 600-weight number title and a large 600-weight amount in one sans face, but the page title "My invoices" renders at roughly body size and regular weight, like a muted label, so the screen's main heading doesn't get the hierarchy the brief means by "hierarchy comes from size and weight, not from a second face."
- hierarchy · run 3 · fail · default: The "My invoices" title renders small, regular weight and muted, lighter than the 600-weight column headers below it, so the page has no size-and-weight lead despite the brief's "hierarchy comes from size and weight, not from a second face."
- hierarchy · run 3 · fail · empty: The page Heading "My invoices" renders small, regular-weight and muted, smaller and lighter than the empty state's bold "No invoices yet", so the page title doesn't lead, breaking "hierarchy comes from size and weight, not from a second face."
- hierarchy · run 3 · fail · default, sheet open: The screen Heading "My invoices" renders small, regular-weight and muted, lighter than the 600 table headers beneath it, so the page title carries no rank; that breaks "Titles (24px and up) and a single large figure use 600 with slightly tightened tracking", even though the sheet's large 600 amount and semibold number do follow "hierarchy comes from size and weight, not from a second face."
- density · run 1 · pass · default: Rows are about 60px tall, page padding is about 36px and body text is about 16px, matching "Contractor screens have room."
- density · run 2 · pass · default: The contractor table has roomy rows of about 60px, roughly 36px page padding and 16px body text, matching "Contractor screens have room."
- density · run 3 · pass · default: Rows are about 60px tall, with 36px page padding and roomy 16px body text, matching "Contractor screens have room."
- accent · run 1 · pass · default: No accent colour appears on this read-only screen, and status tags use their own red and blue, so nothing breaks "a dusty berry for primary actions, selection and focus only."
- accent · run 2 · pass · default: No heather appears anywhere; the status tags use their own red and blue, consistent with "a dusty berry for primary actions, selection and focus only."
- accent · run 3 · pass · default: No heather appears anywhere and the status tags use their own red and blue, consistent with "a dusty berry for primary actions, selection and focus only."
- elevation · run 1 · pass · default: The table frame is separated by a hairline border with no shadow, consistent with "A shadow means "this floats", never "this is a box"."
- elevation · run 2 · pass · default: The table frame is separated by a hairline border with no shadow, so nothing breaks "A shadow means "this floats", never "this is a box"."
- elevation · run 3 · pass · default: The table frame is separated by a hairline border with no shadow, so nothing breaks "A shadow means "this floats", never "this is a box"."
- copy · run 1 · pass · default: The only added copy is plain column headers (Invoice, Amount, Due, Status) and no error appears, so nothing conflicts with "Copy is second person, active and specific".
- copy · run 2 · pass · default: The only copy is the brief-given heading and column headers, with no error shown, so nothing contradicts "Copy is second person, active and specific".
- copy · run 3 · pass · default: The only copy is the brief-given title, column headers and fixture data, with no error to judge against "Errors say what happened and what to do next."
- repetition · run 1 · pass · default: Each row states its status once in its tag, with no repeated wording, meeting "Say a thing once: a card doesn't repeat "Overdue" in its title, its tag and its text."
- repetition · run 2 · pass · default: Each row states its status only once, in the tag, satisfying "Say a thing once: a card doesn't repeat "Overdue" in its title, its tag and its text."
- repetition · run 3 · pass · default: Each row states its status once, in the tag only, honouring "Say a thing once: a card doesn't repeat "Overdue" in its title, its tag and its text."

## payment-run--repetition

Breaks repetition: The Overdue card's count says 2 overdue invoices, a third Overdue beside its title and its tag.

States: default · empty.

| Criterion | Expected | Run 1 | Run 2 | Run 3 |
| --- | --- | --- | --- | --- |
| hierarchy | pass | pass | pass | pass |
| density | pass | pass | pass | pass |
| accent | pass | pass | pass | pass |
| elevation | pass | pass | pass | pass |
| copy | pass | pass | pass | pass |
| repetition | fail | fail | fail | fail |

- hierarchy · run 1 · pass · default: One sans family carries everything, with the 600-weight "Payment run" title and large amounts set apart from the muted 14px counts by size and weight, matching "hierarchy comes from size and weight, not from a second face."
- hierarchy · run 2 · pass · default: The title, the large amounts and the muted counts are set apart by size and weight in one sans family, matching "hierarchy comes from size and weight, not from a second face."
- hierarchy · run 3 · pass · default: The title, the large card totals and the small muted counts are set apart by size and weight within one sans family, as in "hierarchy comes from size and weight, not from a second face."
- density · run 1 · pass · default: This admin view uses tight page padding of about 28px, compact cards and 14px body text, consistent with "Admin screens are dense."
- density · run 2 · pass · default: This admin screen uses tight 28px-style page padding and compact cards with small type, consistent with "Admin screens are dense."
- density · run 3 · pass · default: This admin screen uses compact cards, tight padding and small body text, which fits "Admin screens are dense."
- accent · run 1 · pass · default: The read-only screen uses no heather anywhere, and its tags use their own status colours, so nothing breaks "a dusty berry for primary actions, selection and focus only."
- accent · run 2 · pass · default: No heather appears anywhere, since the read-only screen has no actions or selection, so nothing breaks "a dusty berry for primary actions, selection and focus only."
- accent · run 3 · pass · default: No heather appears anywhere on this read-only screen, and the tags use their own status colours, so nothing breaks "a dusty berry for primary actions, selection and focus only."
- elevation · run 1 · pass · default: The cards sit flat on the page, separated by hairline borders with no shadow, which respects "A shadow means "this floats", never "this is a box"."
- elevation · run 2 · pass · default: The cards sit flat on the page, separated by hairline borders with no shadow, which honours "A shadow means "this floats", never "this is a box"."
- elevation · run 3 · pass · default: The cards sit flat on the page, separated by a hairline border with no shadow, which respects "A shadow means "this floats", never "this is a box"."
- copy · run 1 · pass · default: The screen adds only plain, specific counts like "2 invoices" and shows no errors, which fits "Copy is second person, active and specific".
- copy · run 2 · pass · default: The screen adds only plain, specific counts like "2 invoices" and shows no error, so it meets "Copy is second person, active and specific" where it applies.
- copy · run 3 · pass · default: Beyond the brief's titles and the tags' fixed words, the screen only adds a date and invoice counts, which are plain and specific, and it shows no error, so nothing conflicts with "Copy is second person, active and specific".
- repetition · run 1 · fail · default: The Overdue card says overdue three times: in its title "Overdue", in its "Overdue" tag and again in its text "2 overdue invoices", which breaks "Say a thing once: a card doesn't repeat "Overdue" in its title, its tag and its text."
- repetition · run 2 · fail · default: The Overdue card says "Overdue" in its title and its tag, then again in "2 overdue invoices", while the other cards just say "2 invoices" and "3 invoices"; this is exactly what "Say a thing once: a card doesn't repeat "Overdue" in its title, its tag and its text" forbids.
- repetition · run 3 · fail · default: The Overdue card says it three times, in its title "Overdue", its tag "Overdue" and its count "2 overdue invoices", while the other cards just say "N invoices"; this is exactly the case the brief forbids with "Say a thing once: a card doesn't repeat "Overdue" in its title, its tag and its text."
