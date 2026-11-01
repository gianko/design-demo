# Brief conformance calibration

Written by `pnpm evals:calibrate` (ADR 0014) on 2026-11-01, at `3c80285`. The judge is claude-opus-5-5 at effort high, prompt `29caa10bec15`. The calibration set's 10 screens, 4 kept screens as they are and 6 broken copies, have 37 screen states, and each was judged 3 times. It cost $2.84.

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

- hierarchy · run 1 · pass · default: The "Pay invoices" title stands apart through a larger semibold size in the same sans as the body, and the table headers use weight and muted colour at body size, so "hierarchy comes from size and weight, not from a second face."
- hierarchy · run 2 · pass · default: The 24px semibold "Pay invoices" title, the 600-weight muted column headers and the regular-weight rows all appear in one sans family, so "hierarchy comes from size and weight, not from a second face."
- hierarchy · run 3 · pass · default: The 'Pay invoices' title is set larger and semibold in the same sans as the table, and headers differ only by weight and muted colour, so "hierarchy comes from size and weight, not from a second face."
- density · run 1 · pass · default: Rows sit about 46px apart with roughly 28px page padding and compact 14px text, matching "Admin screens are dense."
- density · run 2 · pass · default: Rows are about 46px tall, with compact 14px text and tight page padding, matching "Admin screens are dense."
- density · run 3 · pass · default: Rows are compact at about 46px, with small body text and tight page padding, fitting "Admin screens are dense."
- accent · run 1 · pass · default: No berry appears anywhere: the disabled "Pay selected" button is a flat neutral, the status tags use amber and nothing is selected, which is consistent with "a dusty berry for primary actions, selection and focus only."
- accent · run 2 · pass · default: No heather appears anywhere: the Pay selected button is a disabled neutral, the checkboxes are unticked and the Awaiting tags are amber, consistent with "a dusty berry for primary actions, selection and focus only."
- accent · run 3 · pass · default: No heather appears anywhere; the disabled Pay selected button is a flat neutral and nothing decorative borrows the accent, consistent with "a dusty berry for primary actions, selection and focus only."
- elevation · run 1 · pass · default: The table frame is separated from the page by a hairline border with no visible shadow, which respects "A shadow means "this floats", never "this is a box"."
- elevation · run 2 · pass · default: The table frame is a flat surface edged by a hairline with no visible shadow, so it respects "A shadow means "this floats", never "this is a box"."
- elevation · run 3 · pass · default: The table frame is flat with a hairline border and no shadow, respecting "A shadow means "this floats", never "this is a box"."
- copy · run 1 · pass · default: The screen adds only plain column headers (Invoice, Contractor, Amount, Due, Status) and shows no error; the footer and button copy are the brief's own, so nothing breaks "Copy is second person, active and specific".
- copy · run 2 · pass · default: The only copy the screen adds is plain column headers (Invoice, Contractor, Amount, Due, Status), the rest comes from the brief, and there is no error to judge, so nothing breaks "Copy is second person, active and specific".
- copy · run 3 · pass · default: The screen adds only plain column headers (Invoice, Contractor, Amount, Due, Status) and no errors appear, so nothing breaks "Copy is second person, active and specific".
- repetition · run 1 · pass · default: Each row states its status once, in the "Awaiting" tag, with no repeated wording in other cells, honouring "Say a thing once: a card doesn't repeat "Overdue" in its title, its tag and its text."
- repetition · run 2 · pass · default: Each row states its status once, in its Awaiting tag, and nowhere else, in line with "Say a thing once: a card doesn't repeat "Overdue" in its title, its tag and its text."
- repetition · run 3 · pass · default: Each row states its status once, in the 'Awaiting' tag, with no echo elsewhere, honouring "Say a thing once: a card doesn't repeat "Overdue" in its title, its tag and its text."

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

- hierarchy · run 1 · pass · default: A single sans family is used throughout, with the "My invoices" title set larger and bolder and the table headers set apart by weight and muted colour, so "hierarchy comes from size and weight, not from a second face."
- hierarchy · run 2 · pass · default: The "My invoices" title stands apart from the table through a larger, heavier weight of the same sans family, and the headers differ by weight and muted colour, so "hierarchy comes from size and weight, not from a second face."
- hierarchy · run 3 · pass · default: The "My invoices" title is set larger and heavier than the body rows, and the column headers differ by weight and muted colour in the same family, so "hierarchy comes from size and weight, not from a second face."
- density · run 1 · pass · default: Rows are about 60px tall, page padding is about 36px and the body text reads near 16px, matching the brief's line "Contractor screens have room."
- density · run 2 · pass · default: The rows are about 60px tall, the page padding is about 36px and the body text is roomy, matching "Contractor screens have room."
- density · run 3 · pass · default: Rows are roughly 60px tall with about 36px of page padding and larger body text, matching "Contractor screens have room."
- accent · run 1 · pass · default: No heather appears on this read-only screen, and the status tags use their own red and blue, consistent with "a dusty berry for primary actions, selection and focus only."
- accent · run 2 · pass · default: No berry accent is spent on decoration; the only colour is the red and blue status tags, consistent with "a dusty berry for primary actions, selection and focus only."
- accent · run 3 · pass · default: No heather appears anywhere; the only colour is in the status tags, consistent with an accent reserved for "a dusty berry for primary actions, selection and focus only."
- elevation · run 1 · pass · default: The table frame is separated by a hairline border rather than a shadow, honouring "A shadow means "this floats", never "this is a box"."
- elevation · run 2 · pass · default: The table sits flat with a hairline border and no shadow, so nothing breaks "A shadow means "this floats", never "this is a box"."
- elevation · run 3 · pass · default: The table frame is separated from the page by a hairline border with no visible shadow, respecting "A shadow means "this floats", never "this is a box"."
- copy · run 1 · pass · default: The screen adds only plain column headers (Invoice, Amount, Due, Status) and shows no error, so nothing contradicts "Copy is second person, active and specific".
- copy · run 2 · pass · default: The only added copy is the short column headers "Invoice", "Amount", "Due" and "Status", which are plain and specific, and no error shows, so nothing breaks "Copy is second person, active and specific".
- copy · run 3 · pass · default: The only words the screen adds are plain column headers (Invoice, Amount, Due, Status), with no errors shown, so nothing breaks "Copy is second person, active and specific".
- repetition · run 1 · pass · default: Each row states its status only once, in its tag, meeting "Say a thing once: a card doesn't repeat "Overdue" in its title, its tag and its text."
- repetition · run 2 · pass · default: Each row states its status once, in its tag, with no echo elsewhere, honouring "Say a thing once: a card doesn't repeat "Overdue" in its title, its tag and its text."
- repetition · run 3 · pass · default: Each status word appears only once, in its tag, with no echo in other cells, in line with "Say a thing once: a card doesn't repeat "Overdue" in its title, its tag and its text."

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

- hierarchy · run 1 · pass · default: The title, card headings, large amounts and muted counts all appear in one sans family, separated only by size and weight, so "hierarchy comes from size and weight, not from a second face."
- hierarchy · run 2 · pass · default: The title, card headings, large amounts and muted counts are set apart by size and weight within one sans family, so "hierarchy comes from size and weight, not from a second face."
- hierarchy · run 3 · pass · default: The title, card headings and large amounts appear to share one sans family, with hierarchy set by size and 600 weight, so "hierarchy comes from size and weight, not from a second face."
- density · run 1 · pass · default: For the admin, the screen uses tight page padding, compact cards and small body text, which fits "Admin screens are dense."
- density · run 2 · pass · default: The admin screen uses tight page padding, compact cards and small body text, matching "Admin screens are dense."
- density · run 3 · pass · default: This admin screen uses tight page padding, compact cards and small body text, consistent with "Admin screens are dense."
- accent · run 1 · pass · default: No heather appears anywhere on this read-only screen, and the tags use status colours, so nothing contradicts "a dusty berry for primary actions, selection and focus only."
- accent · run 2 · pass · default: No heather appears anywhere, and the tags use their own blue, red and amber status colours, so nothing misuses "a dusty berry for primary actions, selection and focus only."
- accent · run 3 · pass · default: The screen is read-only, with no primary action, selection or focus, and no heather appears anywhere, so nothing breaks "a dusty berry for primary actions, selection and focus only."
- elevation · run 1 · pass · default: The cards sit flat on the page with hairline borders and no shadow, consistent with "A shadow means "this floats", never "this is a box"."
- elevation · run 2 · pass · default: The cards sit flat on the page, separated by hairline borders with no shadows, which respects "A shadow means "this floats", never "this is a box"."
- elevation · run 3 · pass · default: The cards sit flat on the page, separated by hairline borders with no shadow, which respects "A shadow means "this floats", never "this is a box"."
- copy · run 1 · pass · default: The only words the screen adds beyond the brief's fixed titles, date and fixture count labels are none, and no errors appear, so nothing breaks "Copy is second person, active and specific".
- copy · run 2 · pass · default: The only words the screen adds are the fixture-bound "Oct 24" and "2 invoices" counts, which are specific, and there is no error to judge against "Errors say what happened and what to do next."
- copy · run 3 · pass · default: The only words the screen adds are the fixture-bound date and counts such as "2 invoices", which are plain and specific, so nothing breaks "Copy is second person, active and specific", and there is no error to judge.
- repetition · run 1 · pass · default: The Overdue card shows "Overdue" in both its title and its tag, but the screen brief fixes both the card title and the status tag's word, and the body text "2 invoices" doesn't repeat it, so the screen adds nothing that breaks "Say a thing once: a card doesn't repeat "Overdue" in its title, its tag and its text."
- repetition · run 2 · pass · default: The Overdue card's title and its "Overdue" tag both come from the screen brief's fixed card name and fixed tag word, and the card adds no repeating text of its own, so it doesn't break "Say a thing once: a card doesn't repeat "Overdue" in its title, its tag and its text."
- repetition · run 3 · pass · default: The Overdue card shows "Overdue" in both its title and its tag, but the screen brief fixes both the card title and the status tag word, and the count line adds no repeat, so the screen's own words don't break "Say a thing once: a card doesn't repeat "Overdue" in its title, its tag and its text."

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

- hierarchy · run 1 · pass · default: The page title, the invoice number and the large $4,800.00 figure appear to share one sans family and are set apart only by size and weight, as in "hierarchy comes from size and weight, not from a second face."
- hierarchy · run 2 · pass · default: One sans family carries everything, with the "Payment status" title and the $4,800.00 figure set apart by larger size and heavier weight rather than a different typeface, matching "hierarchy comes from size and weight, not from a second face."
- hierarchy · run 3 · pass · default: The title, invoice number and large amount appear to share one sans family, with the title and "$4,800.00" set apart by larger size and heavier weight, so "hierarchy comes from size and weight, not from a second face."
- density · run 1 · pass · default: This contractor screen has a 36px page inset, roomy card padding, body text at about 16px and a full-height button about 44px tall, matching "Contractor screens have room."
- density · run 2 · pass · default: This is a contractor screen and it has room, as "Contractor screens have room." asks: about 36px page padding, a full-height 44px button, roughly 16px body text and generous spacing inside the card.
- density · run 3 · pass · default: The contractor screen has generous page padding of about 36px, a roughly 44px-tall full-width button and 16px body text, matching "Contractor screens have room."
- accent · run 1 · pass · default: The heather berry fill appears only on the primary Send reminder button, while the Overdue tag uses its own red, which fits "a dusty berry for primary actions, selection and focus only."
- accent · run 2 · pass · default: Heather appears only on the primary "Send reminder" button, while the Overdue tag uses its own red status colour, keeping the accent to "a dusty berry for primary actions, selection and focus only."
- accent · run 3 · pass · default: Heather appears only as the fill of the primary "Send reminder" button, and the Overdue tag uses its own red, consistent with "a dusty berry for primary actions, selection and focus only."
- elevation · run 1 · pass · default: The card sits flat on the page, separated by a hairline border with no shadow, consistent with "A shadow means "this floats", never "this is a box"."
- elevation · run 2 · pass · default: The card sits flat on the page, separated by a hairline border with no visible shadow, consistent with "A shadow means "this floats", never "this is a box"."
- elevation · run 3 · pass · default: The card sits flat with a hairline border and no shadow, honouring "A shadow means "this floats", never "this is a box"."
- copy · run 1 · pass · default: The visible copy (the title, "Due " before the date and "Send reminder") is supplied by the screen brief, the screen adds no words of its own, and no error is shown, so nothing breaks "Copy is second person, active and specific".
- copy · run 2 · pass · default: The only words the screen adds are the "Payment status" title and its structural labels, and there is no error state to judge, so nothing breaks "Copy is second person, active and specific".
- copy · run 3 · pass · default: Every word on the screen (title, "Due", "Send reminder") is copy the screen brief supplies, and no error is shown, so nothing breaks "Copy is second person, active and specific".
- repetition · run 1 · pass · default: "Overdue" appears only in the status tag, not in the title (the invoice number) or the body text, honouring "Say a thing once: a card doesn't repeat "Overdue" in its title, its tag and its text."
- repetition · run 2 · pass · default: "Overdue" appears once, in the status tag, and not in the title or the text, as the brief asks with "Say a thing once: a card doesn't repeat "Overdue" in its title, its tag and its text."
- repetition · run 3 · pass · default: "Overdue" appears only in the status tag, not in the title or body text, so the card follows "Say a thing once: a card doesn't repeat "Overdue" in its title, its tag and its text."

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

- hierarchy · run 1 · pass · default: One sans family is used throughout, and the 600-weight "Payment status" title and the large $4,800.00 figure stand out from the regular-weight details by size and weight alone, so "hierarchy comes from size and weight, not from a second face."
- hierarchy · run 2 · pass · default: One sans family carries everything, with the title and the "$4,800.00" figure set apart only by larger size and heavier weight, matching "hierarchy comes from size and weight, not from a second face."
- hierarchy · run 3 · pass · default: The screen uses one sans family throughout, with the 600-weight "$4,800.00" figure and the "Payment status" title set apart from the 400-weight body by size and weight alone, so "hierarchy comes from size and weight, not from a second face."
- density · run 1 · pass · default: The contractor card has roomy spacing: about 36px page padding, 44px-tall buttons and 16px body lines, which fits "Contractor screens have room."
- density · run 2 · pass · default: For this contractor screen the buttons are about 44px tall, the page padding is generous and the card's lines are well spaced, so "Contractor screens have room."
- density · run 3 · pass · default: The contractor view has room: page padding is about 36px, the buttons are about 44px tall and the body text is about 16px, which fits "Contractor screens have room."
- accent · run 1 · fail · default: Both "Send reminder" and the added "Download invoice" are filled heather buttons, so a secondary action takes the accent meant as "a dusty berry for primary actions, selection and focus only" and leaves no single obvious primary action.
- accent · run 1 · fail · reminder-failed: Both "Send reminder" and the secondary "Download invoice" are filled in heather, so the accent no longer marks only "a dusty berry for primary actions, selection and focus only."
- accent · run 2 · fail · default: Both "Send reminder" and the added "Download invoice" are filled heather, so a secondary action takes the accent meant as "a dusty berry for primary actions, selection and focus only."
- accent · run 2 · fail · reminder-failed: Both "Send reminder" and the screen-added "Download invoice" are filled heather buttons, so the accent also lands on a secondary action and two buttons compete as primary, breaking "a dusty berry for primary actions, selection and focus only."
- accent · run 3 · fail · default: Both "Send reminder" and the screen-added "Download invoice" are filled with the same heather, so a secondary action takes the accent that is meant as "a dusty berry for primary actions, selection and focus only."
- accent · run 3 · fail · reminder-failed: Both "Send reminder" and the added "Download invoice" are filled heather buttons, so the accent is spread over a secondary action and the screen no longer shows one primary, against "a dusty berry for primary actions, selection and focus only."
- elevation · run 1 · pass · default: The card sits flat on the page, set apart by a hairline border with no box shadow, which respects "A shadow means "this floats", never "this is a box"."
- elevation · run 2 · pass · default: The card is flat, separated by a hairline with no shadow, consistent with "A shadow means "this floats", never "this is a box"."
- elevation · run 3 · pass · default: The card sits flat on the page, edged by a hairline with no shadow, which respects "A shadow means "this floats", never "this is a box"."
- copy · run 1 · pass · default: The only copy the screen adds is the active, specific button label "Download invoice", which keeps to "Copy is second person, active and specific"; there is no error to judge.
- copy · run 2 · pass · default: The screen's own words, "Payment status" and "Download invoice", are plain and specific, and with no error shown it meets "Copy is second person, active and specific" as far as it goes.
- copy · run 3 · pass · default: The words the screen adds, "Send reminder" and "Download invoice", are active and specific, and there is no error to judge, so the screen meets "Copy is second person, active and specific".
- repetition · run 1 · pass · default: "Overdue" appears only in the status tag, not in the title or the body text, so the card follows "Say a thing once: a card doesn't repeat "Overdue" in its title, its tag and its text."
- repetition · run 2 · pass · default: "Overdue" appears only in the status tag, not in the card's title or text, honouring "Say a thing once: a card doesn't repeat "Overdue" in its title, its tag and its text."
- repetition · run 3 · pass · default: "Overdue" appears only in the status tag, not in the title or the body text, which follows "Say a thing once: a card doesn't repeat "Overdue" in its title, its tag and its text."

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

- hierarchy · run 1 · pass · default: The screen uses one sans family throughout, setting the title, the amount and the invoice number apart by size and weight alone, so "hierarchy comes from size and weight, not from a second face."
- hierarchy · run 2 · pass · default: The title, invoice number, large amount and body lines all use one sans family, set apart by size and weight, so "hierarchy comes from size and weight, not from a second face."
- hierarchy · run 3 · pass · default: The title, invoice number, large amount and muted client line are set apart by size, weight and colour within one sans family, so "hierarchy comes from size and weight, not from a second face."
- density · run 1 · pass · default: For the contractor, the screen has generous page padding, 16px-scale body text and a tall full-width button, so it meets "Contractor screens have room."
- density · run 2 · pass · default: This contractor screen has generous page padding, a tall full-width button and roomy card spacing, matching "Contractor screens have room."
- density · run 3 · pass · default: The contractor card has generous padding, roughly 16px body text and a tall, full-width button, matching "Contractor screens have room."
- accent · run 1 · pass · default: Heather appears only on the primary Send reminder button, while the Overdue tag uses its own red status colour, matching "a dusty berry for primary actions, selection and focus only."
- accent · run 2 · pass · default: The heather fill appears only on the primary Send reminder button, while the Overdue tag uses its own red, consistent with "a dusty berry for primary actions, selection and focus only."
- accent · run 3 · pass · default: Heather appears only on the primary Send reminder button, while the Overdue tag uses red, fitting "a dusty berry for primary actions, selection and focus only."
- elevation · run 1 · fail · reminder-sent: The invoice card is a flat, in-page surface, yet it carries a soft drop shadow under its hairline border, using a shadow to mark a box when "A shadow means "this floats", never "this is a box"."
- elevation · run 1 · fail · reminder-failed: The static card already has a hairline border but also seems to carry a soft drop shadow along its lower edge, which uses elevation to box content and breaks "A shadow means "this floats", never "this is a box"."
- elevation · run 2 · fail · default: The static invoice card, which sits flat on the page, seems to carry a soft drop shadow on top of its hairline border, using a shadow to mark a box against "A shadow means "this floats", never "this is a box"."
- elevation · run 2 · fail · reminder-sent: The flat in-page card appears to carry a soft drop shadow on top of its hairline border, which uses shadow to mark a box and contradicts "A shadow means "this floats", never "this is a box"."
- elevation · run 2 · fail · reminder-failed: The static, flat invoice card appears to carry a soft drop shadow along with its hairline border, which breaks "A shadow means "this floats", never "this is a box"."
- elevation · run 3 · fail · default: The flat invoice card appears to carry a soft drop shadow beneath its hairline border, using a shadow to frame a box, against "A shadow means "this floats", never "this is a box"."
- copy · run 1 · pass · default: All visible copy is the brief's own (title, "Due " plus bound fields, and Send reminder), and no error state is shown, so nothing the screen adds breaks "Copy is second person, active and specific".
- copy · run 2 · pass · default: The only copy the screen adds is the active, specific "Send reminder" button, and no error is shown, so nothing breaks "Copy is second person, active and specific".
- copy · run 3 · pass · default: The screen adds no copy beyond the brief's bound fields, its literal "Due " and its action label, and shows no error, so nothing breaks "Copy is second person, active and specific".
- repetition · run 1 · pass · default: "Overdue" appears only once, in the status tag, and not in the title or body text, which honours "Say a thing once: a card doesn't repeat "Overdue" in its title, its tag and its text."
- repetition · run 2 · pass · default: "Overdue" appears only in the status tag, while the title is the invoice number and the text gives the due date, honouring "Say a thing once: a card doesn't repeat "Overdue" in its title, its tag and its text."
- repetition · run 3 · pass · default: "Overdue" appears only in the status tag, while the title is the invoice number and the text gives the due date, honouring "Say a thing once: a card doesn't repeat "Overdue" in its title, its tag and its text."

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

- hierarchy · run 1 · pass · default: The title is set larger and heavier than the body, and the table headers use the same face in a muted 600 weight, so "hierarchy comes from size and weight, not from a second face."
- hierarchy · run 2 · pass · default: The page title stands apart from the table only by larger size and 600 weight, and the headers use weight and muted ink in the same single sans, so "hierarchy comes from size and weight, not from a second face."
- hierarchy · run 3 · pass · default: The title "Streamline your payroll" stands apart from the body through larger 600-weight type in the same sans, and the table headers use weight and muted colour, so "hierarchy comes from size and weight, not from a second face."
- density · run 1 · pass · default: The admin table uses compact rows of about 46px, 14px text and roughly 28px page padding, matching "Admin screens are dense."
- density · run 2 · pass · default: This admin table uses compact rows of about 46px, 14px text and tight page padding, matching "Admin screens are dense."
- density · run 3 · pass · default: The admin table uses compact rows around 46px with 14px text and tight page padding, matching "Admin screens are dense."
- accent · run 1 · pass · default: No heather appears on decoration: the disabled "Pay selected" button is a flat neutral and the status tags use amber, consistent with "a dusty berry for primary actions, selection and focus only."
- accent · run 2 · pass · default: No heather appears on any decoration: the disabled "Pay selected" button uses a flat neutral and the status tags use amber, so the accent is kept for "a dusty berry for primary actions, selection and focus only."
- accent · run 3 · pass · default: No heather appears on decoration: the disabled Pay selected button is a flat neutral and the checkboxes are unticked, consistent with "a dusty berry for primary actions, selection and focus only."
- elevation · run 1 · pass · default: The table card is flat, separated by a hairline with no shadow, which honours "A shadow means "this floats", never "this is a box"."
- elevation · run 2 · pass · default: The table frame is flat with a hairline border and casts no shadow, which respects "A shadow means "this floats", never "this is a box"."
- elevation · run 3 · pass · default: The table frame is flat with a hairline border and no shadow, so nothing breaks "A shadow means "this floats", never "this is a box"."
- copy · run 1 · fail · default: The screen replaces the brief's title "Pay invoices" with the vague marketing line "Streamline your payroll", which breaks "Copy is second person, active and specific" because it names no concrete task.
- copy · run 1 · fail · empty: The screen replaces the brief's "Pay invoices" title with the added marketing line "Streamline your payroll", which is vague rather than meeting "Copy is second person, active and specific".
- copy · run 1 · fail · payment-scheduled: The screen replaces the brief's title "Pay invoices" with the vague marketing line "Streamline your payroll", which says nothing specific about this task and breaks "Copy is second person, active and specific".
- copy · run 1 · fail · payment-failed: The error toast is good, but the screen replaces the title "Pay invoices" with the vague marketing line "Streamline your payroll", which is not "Copy is second person, active and specific".
- copy · run 1 · fail · default, rows ticked: The page title reads "Streamline your payroll", a vague marketing line in place of the brief's "Pay invoices" and short of "Copy is second person, active and specific".
- copy · run 2 · fail · default: The screen replaces the brief's title "Pay invoices" with the marketing slogan "Streamline your payroll", which is vague rather than "Copy is second person, active and specific".
- copy · run 2 · fail · empty: The screen replaces the brief's "Pay invoices" title with the vague marketing line "Streamline your payroll", which breaks "Copy is second person, active and specific".
- copy · run 2 · fail · payment-scheduled: The screen replaces the brief's title "Pay invoices" with the marketing slogan "Streamline your payroll", which breaks "Copy is second person, active and specific" because it names no task on this screen.
- copy · run 2 · fail · payment-failed: The toast is good, but the screen swaps the page title for the vague marketing line "Streamline your payroll", which breaks "Copy is second person, active and specific" because it doesn't name the task of paying these invoices.
- copy · run 2 · fail · default, rows ticked: The screen replaces the brief's "Pay invoices" title with the vague marketing line "Streamline your payroll", which says nothing concrete about this screen's task, breaking "Copy is second person, active and specific".
- copy · run 3 · fail · default: The screen replaces the brief's "Pay invoices" title with the vague marketing line "Streamline your payroll", which fails "Copy is second person, active and specific".
- copy · run 3 · fail · empty: The screen replaces the brief's "Pay invoices" title with the marketing line "Streamline your payroll", which is vague rather than "second person, active and specific".
- copy · run 3 · fail · payment-scheduled: The screen replaces the brief's "Pay invoices" title with the slogan "Streamline your payroll", which is marketing filler rather than what the brief demands: "Copy is second person, active and specific".
- copy · run 3 · fail · payment-failed: The error toast is good, but the screen swaps the brief's "Pay invoices" title for the vague marketing line "Streamline your payroll", which breaks "Copy is second person, active and specific".
- copy · run 3 · fail · default, rows ticked: The screen swaps the brief's title for its own marketing line "Streamline your payroll", which is vague rather than "second person, active and specific" about paying these invoices.
- repetition · run 1 · pass · default: Each row states its status only once, in its "Awaiting" tag, with no echo in other cells, so it meets "Say a thing once: a card doesn't repeat "Overdue" in its title, its tag and its text."
- repetition · run 2 · pass · default: Each row states its status once, in its "Awaiting" tag, and the footer states the selection once, so the screen honours "Say a thing once: a card doesn't repeat "Overdue" in its title, its tag and its text."
- repetition · run 3 · pass · default: Each row states its status once, in its Awaiting tag, with no echo in other cells, honouring "Say a thing once: a card doesn't repeat "Overdue" in its title, its tag and its text."

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

- hierarchy · run 1 · pass · default: The "Pay invoices" title stands apart through larger size and 600 weight, and the table headers use weight and muted colour in the same single family, so "hierarchy comes from size and weight, not from a second face."
- hierarchy · run 2 · pass · default: The "Pay invoices" title stands out through larger size and weight, while the table headers use weight and muted colour in the same single face, so "hierarchy comes from size and weight, not from a second face."
- hierarchy · run 3 · pass · default: The "Pay invoices" title stands apart by larger size and 600 weight, and the table headers use weight and muted colour in the same face, so "hierarchy comes from size and weight, not from a second face."
- density · run 1 · fail · default: On this admin screen the rows and header measure about 60px, the Pay selected button is about 44px tall and the page padding is about 36px, which is contractor sizing and breaks "Admin screens are dense."
- density · run 1 · fail · empty: This is an admin screen, but the page inset is about 36px and the empty-state text looks about 16px, the contractor's full-room values rather than the admin's 28px padding and 14px body, so it misses "Admin screens are dense."
- density · run 1 · fail · payment-scheduled: This admin screen renders 60px header and body rows, roughly 16px body text and 36px page padding, which are the contractor values rather than the 46px rows, 14px text and 28px padding that "Admin screens are dense." calls for.
- density · run 1 · fail · payment-failed: This admin screen uses contractor spacing: rows are about 60px apart, the button is about 44px tall and the page padding is about 36px, which breaks "Admin screens are dense."
- density · run 1 · fail · default, rows ticked: This admin screen uses roughly 60px rows, a 44px Pay selected button, 36px page padding and about 16px body text, which are the contractor values, so it breaks "Admin screens are dense."
- density · run 2 · fail · default: This admin screen uses roughly 60px rows, 36px page padding and a 44px-tall Pay selected button, which is contractor spacing, so it breaks "Admin screens are dense."
- density · run 2 · fail · empty: This admin screen uses a 36px page inset and body text that looks about 16px, which are the contractor's 'full room' values rather than the admin's 28px and 14px, so it misses "Admin screens are dense."
- density · run 2 · fail · payment-scheduled: On this admin screen the rows and header row are about 60px tall, the page padding is about 36px and the Pay selected button is about 44px tall, which is contractor sizing and breaks "Admin screens are dense."
- density · run 2 · fail · payment-failed: This is an admin screen, but it uses contractor sizing: rows and the header are about 60px tall, the Pay selected button is about 44px, body text looks like 16px and page padding is about 36px, which breaks "Admin screens are dense."
- density · run 2 · fail · default, rows ticked: On this admin screen the rows and header measure about 60px, the Pay selected button about 44px tall and the page padding about 36px, which are the contractor's full-room values, so it breaks "Admin screens are dense."
- density · run 3 · fail · default: This is an admin screen, but the rows and header measure about 60px, the Pay selected button is about 44px tall, body text looks about 16px and page padding is about 36px, which is contractor sizing when the brief says "Admin screens are dense."
- density · run 3 · fail · empty: On this admin screen the title and empty-state card sit 36px from the screen edges on both sides, which is the contractor's page padding rather than the admin's 28px, so it breaks "Admin screens are dense."
- density · run 3 · fail · payment-scheduled: This admin screen uses roomy measurements: rows and the header row are about 60px tall, page padding is about 36px and body text looks about 16px, which is contractor sizing and breaks "Admin screens are dense."
- density · run 3 · fail · payment-failed: This admin screen uses contractor-sized spacing: rows about 60px tall, page padding about 36px, a roughly 44px-tall Pay selected button and 16px-looking body text, where the brief says "Admin screens are dense."
- density · run 3 · fail · default, rows ticked: This admin screen uses roughly 60px rows, about 16px body text, 36px page padding and a 44px-tall Pay selected button, which is contractor sizing, so it breaks "Admin screens are dense."
- accent · run 1 · pass · default: No heather appears anywhere on the screen: the Pay selected button is disabled, no rows are selected, and the status tags use amber, which is consistent with "a dusty berry for primary actions, selection and focus only."
- accent · run 2 · pass · default: No heather appears on non-interactive elements; the only primary action, the disabled Pay selected button, uses a quiet neutral fill, which is consistent with "a dusty berry for primary actions, selection and focus only."
- accent · run 3 · pass · default: No heather shows anywhere: the disabled Pay selected button has a flat neutral fill, nothing is selected and the status tags use amber, which is consistent with "a dusty berry for primary actions, selection and focus only."
- elevation · run 1 · pass · default: The table frame sits flat on the page with a hairline border and no shadow, which respects "A shadow means "this floats", never "this is a box"."
- elevation · run 2 · pass · default: The table frame sits flat, separated by a hairline with no shadow, which respects "A shadow means "this floats", never "this is a box"."
- elevation · run 3 · pass · default: The table frame is flat and set apart by a hairline, with no shadow, so nothing breaks "A shadow means "this floats", never "this is a box"."
- copy · run 1 · pass · default: The screen adds only plain column headers (Invoice, Contractor, Amount, Due, Status) beyond the brief-given copy, and it shows no error, so nothing breaks "Copy is second person, active and specific".
- copy · run 2 · pass · default: The screen adds no copy beyond the brief-given title, button label and selection text, and shows no error, so nothing breaks "Copy is second person, active and specific".
- copy · run 3 · pass · default: The only words the screen adds beyond the brief's fixed copy are plain column headers (Invoice, Contractor, Amount, Due, Status), and no error appears, so nothing conflicts with "Copy is second person, active and specific".
- repetition · run 1 · pass · default: Each row states its status once, in the "Awaiting" tag, and repeats it nowhere else in the row, which honours "Say a thing once: a card doesn't repeat "Overdue" in its title, its tag and its text."
- repetition · run 2 · pass · default: Each row states its status once, in its "Awaiting" tag, and does not repeat it elsewhere in the row, in line with "Say a thing once: a card doesn't repeat "Overdue" in its title, its tag and its text."
- repetition · run 3 · pass · default: Each row states its status once, in its "Awaiting" tag, and repeats it nowhere else in the row, which meets "Say a thing once: a card doesn't repeat "Overdue" in its title, its tag and its text."

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

- hierarchy · run 1 · fail · default: The "My invoices" heading renders small, regular-weight and muted, lighter than the 600-weight table headers, so it doesn't lead the page; this breaks "hierarchy comes from size and weight, not from a second face" and the brief's line that "Titles (24px and up) and a single large figure use 600".
- hierarchy · run 1 · fail · empty: The page Heading "My invoices" renders small, light and muted, weaker than the bold "No invoices yet" card title beneath it, so the screen title doesn't read as the top level, despite "Titles (24px and up) and a single large figure use 600 with slightly tightened tracking".
- hierarchy · run 1 · fail · default, sheet open: In the Sheet the number and the large $4,800.00 figure stand out by size and weight in the one family, but the page Heading "My invoices" renders small, regular and muted, quieter than the 600 table headers, so "hierarchy comes from size and weight" fails for the screen's title.
- hierarchy · run 2 · fail · default: The "My invoices" title renders small, light and muted, smaller and quieter than the bold table headers below it, so the page title doesn't lead; this breaks "hierarchy comes from size and weight, not from a second face."
- hierarchy · run 2 · fail · empty: The "My invoices" page title renders as small, light, muted text, weaker than the bold "No invoices yet" below it, so the title doesn't lead as the brief requires: "hierarchy comes from size and weight, not from a second face".
- hierarchy · run 2 · fail · default, sheet open: The sheet's title and the $4,800.00 figure read through size and weight in one face, but the screen Heading "My invoices" renders small and regular-weight, weaker than the semibold column headers, so it breaks the brief's rule that "Titles (24px and up) and a single large figure use 600".
- hierarchy · run 3 · fail · default: The "My invoices" heading renders small, regular-weight and muted, lighter than the 600-weight table headers beneath it, so the page title doesn't lead even though "hierarchy comes from size and weight, not from a second face."
- hierarchy · run 3 · fail · empty: The page title "My invoices" renders small, regular-weight and muted, smaller and lighter than the bold "No invoices yet" inside the card, so the screen's top-level title loses the hierarchy that "hierarchy comes from size and weight, not from a second face" calls for.
- hierarchy · run 3 · fail · default, sheet open: The page Heading "My invoices" renders small and regular-weight, no larger or heavier than the 600-weight table headers, so it reads as a label rather than a title, which goes against "hierarchy comes from size and weight, not from a second face."
- density · run 1 · pass · default: Rows are about 60px tall, the page padding is about 36px and the body text is around 16px, which matches "Contractor screens have room."
- density · run 2 · pass · default: The rows are about 60px tall, the text is about 16px and the page has about 36px of padding, which matches "Contractor screens have room."
- density · run 3 · pass · default: The contractor table has roomy rows of about 60px, larger body text and generous page padding, matching "Contractor screens have room."
- accent · run 1 · pass · default: The screen has no actions, selection or focus, and no heather appears anywhere, so nothing goes against "a dusty berry for primary actions, selection and focus only."
- accent · run 2 · pass · default: No heather appears anywhere; the read-only screen shows only status colours, which fits "a dusty berry for primary actions, selection and focus only."
- accent · run 3 · pass · default: No heather appears anywhere on this read-only screen, and the status tags use their own red and blue, consistent with "a dusty berry for primary actions, selection and focus only."
- elevation · run 1 · pass · default: The table sits flat on the page with a hairline border and no shadow, which is consistent with "A shadow means "this floats", never "this is a box"."
- elevation · run 2 · pass · default: The table frame is flat and edged with a hairline, with no shadow, consistent with "A shadow means "this floats", never "this is a box"."
- elevation · run 3 · pass · default: The table frame is flat with a hairline border and no shadow, in keeping with "A shadow means "this floats", never "this is a box"."
- copy · run 1 · pass · default: The only words on screen are the brief's heading, the column headers and the fixture values, so the screen adds nothing that breaks "Copy is second person, active and specific", and it shows no error.
- copy · run 2 · pass · default: The screen adds no copy beyond the brief's title, column headers and fixture values, and shows no error, so "Copy is second person, active and specific" has nothing to break.
- copy · run 3 · pass · default: The only words are the brief's heading, the column headers and the fixture data, with no added copy to break "Copy is second person, active and specific", and there is no error to judge.
- repetition · run 1 · pass · default: Each row states its status once, in its tag, with no echo elsewhere in the row, which honours "Say a thing once: a card doesn't repeat "Overdue" in its title, its tag and its text."
- repetition · run 2 · pass · default: Each row states its status only once, in its tag, honouring "Say a thing once: a card doesn't repeat "Overdue" in its title, its tag and its text."
- repetition · run 3 · pass · default: Each row states its status once, in its tag, with no echo elsewhere, honouring "Say a thing once: a card doesn't repeat "Overdue" in its title, its tag and its text."

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

- hierarchy · run 1 · pass · default: The title, card headings, large amounts and muted counts all use one sans family, separated only by size and weight, so "hierarchy comes from size and weight, not from a second face."
- hierarchy · run 2 · pass · default: The title, card headings, large amounts and muted counts all appear in one sans family and are set apart only by size and weight, consistent with "hierarchy comes from size and weight, not from a second face."
- hierarchy · run 3 · pass · default: The title, card headings and large amounts use one sans family, set apart only by size and weight, so "hierarchy comes from size and weight, not from a second face."
- density · run 1 · pass · default: The admin screen uses compact cards, tight padding and small body text, which fits "Admin screens are dense."
- density · run 2 · pass · default: This admin screen uses tight page padding, compact cards and small body text, fitting "Admin screens are dense."
- density · run 3 · pass · default: This admin screen uses tight page padding, compact cards and small body text, consistent with "Admin screens are dense."
- accent · run 1 · pass · default: No heather appears; the only colour is in the status tags, which use their own palette, so nothing breaks "a dusty berry for primary actions, selection and focus only."
- accent · run 2 · pass · default: No heather accent appears anywhere on this read-only screen, and the tags use their own status colours, so nothing breaks "a dusty berry for primary actions, selection and focus only."
- accent · run 3 · pass · default: No heather appears; the screen is read-only with no actions, selection or focus, so nothing breaks "a dusty berry for primary actions, selection and focus only."
- elevation · run 1 · pass · default: The cards sit flat, separated by a hairline border with no shadow, consistent with "A shadow means "this floats", never "this is a box"."
- elevation · run 2 · pass · default: The cards sit flat on the page with a hairline border and no shadow, respecting "A shadow means "this floats", never "this is a box"."
- elevation · run 3 · pass · default: The cards sit flat on the page with hairline borders and no shadow, matching "A shadow means "this floats", never "this is a box"."
- copy · run 1 · pass · default: The only added copy is plain count text such as "2 invoices", and there is no error to judge, so nothing breaks "Copy is second person, active and specific".
- copy · run 2 · pass · default: The added copy ("2 invoices", "3 invoices") is plain and specific, there is no error shown, and nothing contradicts "Copy is second person, active and specific".
- copy · run 3 · pass · default: The screen adds only short, specific labels like "2 invoices" and shows no error, so nothing breaks "Copy is second person, active and specific".
- repetition · run 1 · fail · default: The Overdue card says "Overdue" in its title and its tag, then again in "2 overdue invoices", where the other cards just say "2 invoices" and "3 invoices"; that is exactly what the brief forbids: "Say a thing once: a card doesn't repeat "Overdue" in its title, its tag and its text."
- repetition · run 2 · fail · default: The Overdue card says "Overdue" in its title and its tag, and then again in its count "2 overdue invoices", while the other cards just say "2 invoices"; this breaks "Say a thing once: a card doesn't repeat "Overdue" in its title, its tag and its text."
- repetition · run 3 · fail · default: The Overdue card says overdue three times, in its title "Overdue", its tag "Overdue" and its count "2 overdue invoices", breaking "Say a thing once: a card doesn't repeat "Overdue" in its title, its tag and its text."
