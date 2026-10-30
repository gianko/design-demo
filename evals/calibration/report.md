# Brief conformance calibration

Written by `pnpm evals:calibrate` (ADR 0014) on 2026-10-30, at `9356085` with uncommitted changes. The judge is claude-opus-5-5 at effort high, prompt `a196ad07bd4a`. The calibration set's 8 screens, 3 kept screens as they are and 5 broken copies, have 33 screen states, and each was judged 3 times. It cost $2.54.

## Right verdicts and flips

A screen's verdict on a criterion in one run fails when any of its states fails it. It's right when a kept screen passes, and when a broken copy fails the criterion it breaks and passes the rest. A screen's criterion flipped when its verdicts differ between runs.

| Criterion | Right | Flipped |
| --- | --- | --- |
| hierarchy | 24/24 (100%) | 0/8 (0%) |
| density | 24/24 (100%) | 0/8 (0%) |
| accent | 21/24 (88%) | 0/8 (0%) |
| elevation | 24/24 (100%) | 0/8 (0%) |
| copy | 24/24 (100%) | 0/8 (0%) |
| repetition | 24/24 (100%) | 0/8 (0%) |
| **All** | 141/144 (98%) | 0/48 (0%) |

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

- hierarchy · run 1 · pass · default: The bold, larger "Pay invoices" title and the 600-weight muted column headers set hierarchy in the same sans as the body, so "hierarchy comes from size and weight, not from a second face."
- hierarchy · run 2 · pass · default: The 'Pay invoices' title is set larger and in 600, and the table headers use 600 in muted ink at body size, all in one sans family, so "hierarchy comes from size and weight, not from a second face."
- hierarchy · run 3 · pass · default: The "Pay invoices" title is set larger and heavier than the 600-weight muted column headers and the regular body rows, all in one sans family, so "hierarchy comes from size and weight, not from a second face."
- density · run 1 · pass · default: Rows sit about 46px apart with tight page padding and compact controls, matching "Admin screens are dense."
- density · run 2 · pass · default: Rows are about 46px tall with 14px body text and tight page padding, matching "Admin screens are dense." for this admin view.
- density · run 3 · pass · default: For the admin, rows are about 46px tall with 14px text and tight page padding, so the table is compact as "Admin screens are dense." requires.
- accent · run 1 · pass · default: No heather shows anywhere: the disabled "Pay selected" button uses a flat neutral fill and the status tags use amber, consistent with "a dusty berry for primary actions, selection and focus only."
- accent · run 2 · pass · default: No berry appears anywhere: the disabled Pay selected button is a flat neutral and the unticked checkboxes are neutral, which is consistent with "a dusty berry for primary actions, selection and focus only."
- accent · run 3 · pass · default: No berry appears anywhere because the only action, Pay selected, is disabled in a flat neutral, which is consistent with keeping the accent to "a dusty berry for primary actions, selection and focus only."
- elevation · run 1 · pass · default: The table frame is a flat surface separated by a hairline with no visible shadow, respecting "A shadow means "this floats", never "this is a box"."
- elevation · run 2 · pass · default: The table frame is separated from the page by a hairline with no shadow, honouring "A shadow means "this floats", never "this is a box"."
- elevation · run 3 · pass · default: The table frame sits flat on the page, edged by a hairline with no shadow, which honours "A shadow means "this floats", never "this is a box"."
- copy · run 1 · pass · default: The visible copy ("Pay selected", "No invoices selected") is the brief's own, active and specific, and no error is shown, so "Copy is second person, active and specific" is not broken.
- copy · run 2 · pass · default: The visible copy ("No invoices selected", "Pay selected") is plain and active, and there is no error on screen to judge against "Errors say what happened and what to do next."
- copy · run 3 · pass · default: The visible copy ("Pay selected", "No invoices selected") is the screen brief's own wording, and there is no error to judge, so nothing breaks "Copy is second person, active and specific".
- repetition · run 1 · pass · default: Each row states its status once, in its "Awaiting" tag, with no echo in other cells, so it holds to "Say a thing once: a card doesn't repeat "Overdue" in its title, its tag and its text."
- repetition · run 2 · pass · default: Each row states its status only once, in the Awaiting tag, keeping to "Say a thing once: a card doesn't repeat "Overdue" in its title, its tag and its text."
- repetition · run 3 · pass · default: Each row states its status only once, in its Awaiting tag, so the screen meets "Say a thing once: a card doesn't repeat "Overdue" in its title, its tag and its text."

## my-invoices

Kept, as it is.

States: default · empty · default, sheet open.

| Criterion | Expected | Run 1 | Run 2 | Run 3 |
| --- | --- | --- | --- | --- |
| hierarchy | pass | pass | pass | pass |
| density | pass | pass | pass | pass |
| accent | pass | fail | fail | fail |
| elevation | pass | pass | pass | pass |
| copy | pass | pass | pass | pass |
| repetition | pass | pass | pass | pass |

- hierarchy · run 1 · pass · default: The "My invoices" title and the muted column headers are set apart by weight and size in the same sans family, matching "hierarchy comes from size and weight, not from a second face."
- hierarchy · run 2 · pass · default: The 24px-ish 600-weight "My invoices" title, 600 muted headers and regular body all share one sans family, so "hierarchy comes from size and weight, not from a second face."
- hierarchy · run 3 · pass · default: The title "My invoices" and the muted header row are set apart by size and weight within one sans family, so "hierarchy comes from size and weight, not from a second face."
- density · run 1 · pass · default: Rows are about 60px tall, with generous page padding and roomy body text, so the screen gives the contractor space as "Contractor screens have room." asks.
- density · run 2 · pass · default: Rows are about 60px tall, with 36px page padding and roughly 16px body text, matching "Contractor screens have room."
- density · run 3 · pass · default: The contractor table has roughly 60px rows, generous page padding and larger body text, matching "Contractor screens have room."
- accent · run 1 · fail · default, sheet open: Both invoice numbers in the table are tinted a berry-brown colour that differs from the ink of the other cells, which puts colour on plain row text rather than keeping the accent to "a dusty berry for primary actions, selection and focus only."
- accent · run 2 · fail · default, sheet open: The invoice numbers in every table row are tinted in a berry/red colour like link text, even though they are neither a primary action, a selection nor focus, which breaks "a dusty berry for primary actions, selection and focus only."
- accent · run 3 · fail · default, sheet open: Every invoice number in the table (INV-0142 and INV-0151) appears tinted in what looks like the berry accent, even though nothing on the rows is a primary action or a selection, which breaks "a dusty berry for primary actions, selection and focus only."
- elevation · run 1 · pass · default: The table frame is a flat surface edged by a hairline with no shadow, respecting "A shadow means "this floats", never "this is a box"."
- elevation · run 2 · pass · default: The table frame is separated by a hairline border with no shadow, consistent with "A shadow means "this floats", never "this is a box"."
- elevation · run 3 · pass · default: The table frame sits flat on the page with a hairline border and no shadow, honouring "A shadow means "this floats", never "this is a box"."
- copy · run 1 · pass · default: The only copy is the brief-given title and plain column headers, with no error shown, so nothing breaks "Copy is second person, active and specific".
- copy · run 2 · pass · default: The only copy is the brief-given title and plain column headers, and there is no error to judge against "Errors say what happened and what to do next."
- copy · run 3 · pass · default: The only copy is the brief-given title and plain column headers, with no error to judge against "Errors say what happened and what to do next."
- repetition · run 1 · pass · default: Each row states its status once, in its tag ("Overdue", "Scheduled"), honouring "Say a thing once: a card doesn't repeat "Overdue" in its title, its tag and its text."
- repetition · run 2 · pass · default: "Overdue" appears only once, in its status tag, which follows "Say a thing once: a card doesn't repeat "Overdue" in its title, its tag and its text."
- repetition · run 3 · pass · default: "Overdue" appears only in its status tag on the INV-0142 row, which meets "Say a thing once: a card doesn't repeat "Overdue" in its title, its tag and its text."

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

- hierarchy · run 1 · pass · default: The title, invoice number, large $4,800.00 figure and body lines are set apart only by size and weight in one sans family, matching "hierarchy comes from size and weight, not from a second face."
- hierarchy · run 2 · pass · default: One sans family carries everything: the invoice number, the large 600-weight "$4,800.00" figure and the "Payment status" title differ only in size and weight, which meets "hierarchy comes from size and weight, not from a second face."
- hierarchy · run 3 · pass · default: The title, the invoice number, the large $4,800.00 figure and the muted client line all share one sans family and differ only in size and weight, so "hierarchy comes from size and weight, not from a second face."
- density · run 1 · pass · default: The contractor card has generous page padding, a full-width 44px-tall button and 16px body text with comfortable spacing, so "Contractor screens have room."
- density · run 2 · pass · default: The contractor view has about 36px page padding, generous card padding, a roughly 44px-tall full-width button and 16px body text, so it meets "Contractor screens have room."
- density · run 3 · pass · default: The contractor card has generous page padding, a tall full-width button, comfortable text and wide spacing between lines, matching "Contractor screens have room."
- accent · run 1 · pass · default: Heather appears only on the primary Send reminder button, while the Overdue tag uses its own red, consistent with "a dusty berry for primary actions, selection and focus only."
- accent · run 2 · pass · default: Heather appears only on the primary "Send reminder" button, while the Overdue tag uses its own red status colour, consistent with "a dusty berry for primary actions, selection and focus only."
- accent · run 3 · pass · default: Heather appears only on the primary Send reminder button, while the Overdue tag uses its own red, consistent with "a dusty berry for primary actions, selection and focus only."
- elevation · run 1 · pass · default: The card sits flat on the page with a hairline border and no shadow, so nothing contradicts "A shadow means "this floats", never "this is a box"."
- elevation · run 2 · pass · default: The card sits flat on the page, separated by a hairline border with no shadow, which respects "A shadow means "this floats", never "this is a box"."
- elevation · run 3 · pass · default: The card sits flat on the page, separated by a hairline border with no shadow, honouring "A shadow means "this floats", never "this is a box"."
- copy · run 1 · pass · default: The visible copy, "Send reminder" and "Due Oct 8", is active and specific, and no error is shown, satisfying "Copy is second person, active and specific".
- copy · run 2 · pass · default: The button reads "Send reminder" and the date reads "Due Oct 8", both active and specific, and no error is shown, so the card meets "Copy is second person, active and specific".
- copy · run 3 · pass · default: "Send reminder" and "Due Oct 8" are active and specific, and no error is shown, so the screen meets "Copy is second person, active and specific".
- repetition · run 1 · pass · default: The status "Overdue" appears only in the tag, not in the card title or body text, honoring "Say a thing once: a card doesn't repeat "Overdue" in its title, its tag and its text."
- repetition · run 2 · pass · default: "Overdue" appears only in the status tag, while the title is the invoice number and the text gives the due date and client, honouring "Say a thing once: a card doesn't repeat "Overdue" in its title, its tag and its text."
- repetition · run 3 · pass · default: "Overdue" appears only in the status tag and not in the title or body text, following "Say a thing once: a card doesn't repeat "Overdue" in its title, its tag and its text."

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

- hierarchy · run 1 · pass · default: The screen uses one sans family throughout, and the title, the large $4,800.00 figure, the invoice number and the muted client line are set apart only by size, weight and colour, so "hierarchy comes from size and weight, not from a second face."
- hierarchy · run 2 · pass · default: One sans family is used throughout, with the 600-weight "Payment status" title and the large "$4,800.00" figure set apart from body text by size and weight alone, meeting "hierarchy comes from size and weight, not from a second face."
- hierarchy · run 3 · pass · default: One sans family carries the screen: the title, invoice number and "$4,800.00" figure stand out through larger size and 600 weight, matching "hierarchy comes from size and weight, not from a second face."
- density · run 1 · pass · default: For the contractor, the card has generous padding, roomy spacing between lines and tall buttons around 44px, which fits "Contractor screens have room."
- density · run 2 · pass · default: The contractor screen gets generous page padding, roomy card spacing and buttons about 44px tall, consistent with "Contractor screens have room."
- density · run 3 · pass · default: For the contractor, the screen has generous page padding, roughly 44px buttons and comfortable spacing between lines, which fits "Contractor screens have room."
- accent · run 1 · fail · default: Both "Send reminder" and the secondary "Download invoice" are filled heather buttons, so the berry no longer marks the one primary action, against "a dusty berry for primary actions, selection and focus only."
- accent · run 1 · fail · reminder-failed: Both "Send reminder" and the secondary "Download invoice" are filled heather buttons, so the accent no longer marks one primary action, breaking "a dusty berry for primary actions, selection and focus only."
- accent · run 2 · fail · default: Both "Send reminder" and the secondary "Download invoice" are filled heather buttons, so the accent is spent on a non-primary action and breaks "a dusty berry for primary actions, selection and focus only."
- accent · run 2 · fail · reminder-failed: Both "Send reminder" and the secondary "Download invoice" are filled heather buttons, so the accent stops being "a dusty berry for primary actions, selection and focus only" and no longer singles out the one primary action.
- accent · run 3 · fail · default: Both "Send reminder" and a secondary "Download invoice" are filled heather buttons, so the accent spreads beyond the one primary action instead of staying "a dusty berry for primary actions, selection and focus only."
- accent · run 3 · fail · reminder-failed: Both "Send reminder" and the secondary "Download invoice" are filled in heather, so the accent is no longer "a dusty berry for primary actions, selection and focus only."
- elevation · run 1 · pass · default: The card sits flat on the page, separated by a hairline border with no shadow, which respects "A shadow means "this floats", never "this is a box"."
- elevation · run 2 · pass · default: The card sits flat with a hairline border and no shadow, which respects "A shadow means "this floats", never "this is a box"."
- elevation · run 3 · pass · default: The card sits flat on the page with a hairline border and no shadow, consistent with "A shadow means "this floats", never "this is a box"."
- copy · run 1 · pass · default: The visible copy ("Send reminder", "Download invoice", "Due Oct 8") is active and specific, and no error is shown, so it meets "Copy is second person, active and specific".
- copy · run 2 · pass · default: The labels "Send reminder", "Download invoice" and "Due Oct 8" are active and specific, there is no error shown to judge, and nothing breaks "Copy is second person, active and specific".
- copy · run 3 · pass · default: The labels "Send reminder", "Download invoice" and "Due Oct 8" are active and specific, and no error appears in this state, meeting "Copy is second person, active and specific".
- repetition · run 1 · pass · default: "Overdue" appears only in the status tag, not in the title or the body text, following "Say a thing once: a card doesn't repeat "Overdue" in its title, its tag and its text."
- repetition · run 2 · pass · default: "Overdue" appears only in the status tag, not in the title ("INV-0142") or the body text, satisfying "Say a thing once: a card doesn't repeat "Overdue" in its title, its tag and its text."
- repetition · run 3 · pass · default: "Overdue" appears only in the status tag, not in the title or the body text, honouring "Say a thing once: a card doesn't repeat "Overdue" in its title, its tag and its text."

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

- hierarchy · run 1 · pass · default: The title, invoice number and large $4,800.00 figure are all one sans family distinguished by size and weight, so "hierarchy comes from size and weight, not from a second face."
- hierarchy · run 2 · pass · default: The title, invoice number, large "$4,800.00" figure and body lines use one sans family and differ only in size and weight, so "hierarchy comes from size and weight, not from a second face."
- hierarchy · run 3 · pass · default: One sans family carries everything, with the 600-weight title, the large "$4,800.00" figure and the regular body lines set apart by size and weight, so "hierarchy comes from size and weight, not from a second face."
- density · run 1 · pass · default: The contractor card has generous page padding, roomy card spacing and a tall full-width button, matching "Contractor screens have room."
- density · run 2 · pass · default: On this contractor screen the page padding is about 36px, the button is about 44px tall and the card has generous inner spacing, matching "Contractor screens have room."
- density · run 3 · pass · default: The contractor view has about 36px page padding, a roughly 44px-tall full-width button and 16px body text, so "Contractor screens have room."
- accent · run 1 · pass · default: The heather fill appears only on the primary "Send reminder" button, while the Overdue tag uses red, consistent with "a dusty berry for primary actions, selection and focus only."
- accent · run 2 · pass · default: Heather appears only as the fill of the primary "Send reminder" button, which fits "a dusty berry for primary actions, selection and focus only."
- accent · run 3 · pass · default: Heather appears only on the primary "Send reminder" button, and the red Overdue tag uses its own status colour, matching "a dusty berry for primary actions, selection and focus only."
- elevation · run 1 · fail · default: The static invoice card, which should be flat with a hairline, carries a soft drop shadow beneath its border, breaking "A shadow means "this floats", never "this is a box"."
- elevation · run 1 · fail · reminder-sent: The static invoice card sits on the page with a soft drop shadow beneath its hairline border, using a shadow to make a box when "A shadow means "this floats", never "this is a box"."
- elevation · run 1 · fail · reminder-failed: The static invoice card sits on the page with a hairline border plus a soft drop shadow, which breaks "A shadow means "this floats", never "this is a box"." because the card does not float.
- elevation · run 2 · fail · default: The static invoice card sits flat on the page but carries a soft drop shadow under its hairline border, using the shadow to mark a box, against "A shadow means "this floats", never "this is a box"."
- elevation · run 2 · fail · reminder-sent: The invoice card sits flat on the page, yet it carries a soft drop shadow on top of its hairline border, using the shadow to mark a box against "A shadow means "this floats", never "this is a box"."
- elevation · run 2 · fail · reminder-failed: The static invoice card sits on the page with a hairline border plus a soft drop shadow beneath it, using a shadow to frame a box even though "A shadow means "this floats", never "this is a box"."
- elevation · run 3 · fail · default: The invoice card sits flat on the page yet has a soft drop shadow under its hairline border, which breaks "A shadow means "this floats", never "this is a box"."
- elevation · run 3 · fail · reminder-sent: The static invoice card sits on the page with a visible soft drop shadow under its hairline border, though it doesn't float, which breaks "A shadow means "this floats", never "this is a box"."
- elevation · run 3 · fail · reminder-failed: The in-page card, which should be flat and separated by a hairline, also carries a soft drop shadow along its bottom edge, breaking "A shadow means "this floats", never "this is a box"."
- copy · run 1 · pass · default: The visible copy, "Send reminder" and "Due Oct 8", is active and specific, and no error is shown, so it meets "Copy is second person, active and specific".
- copy · run 2 · pass · default: The only action reads "Send reminder", which is active and specific, and no error is shown, so the screen meets "Copy is second person, active and specific".
- copy · run 3 · pass · default: The only action reads "Send reminder", which is active and specific, and no error is shown, so it meets "Copy is second person, active and specific".
- repetition · run 1 · pass · default: "Overdue" appears only in the status tag, not in the title or body text, honoring "Say a thing once: a card doesn't repeat "Overdue" in its title, its tag and its text."
- repetition · run 2 · pass · default: "Overdue" appears only in the status tag, while the title shows the invoice number and the body shows "Due Oct 8", following "Say a thing once: a card doesn't repeat "Overdue" in its title, its tag and its text."
- repetition · run 3 · pass · default: "Overdue" appears only in the status tag, while the title shows the invoice number and the text shows "Due Oct 8", which honours "Say a thing once: a card doesn't repeat "Overdue" in its title, its tag and its text."

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

- hierarchy · run 1 · pass · default: The title is set larger and in semibold, and the table headers are body size in 600 muted ink, all in one sans family, so "hierarchy comes from size and weight, not from a second face."
- hierarchy · run 2 · pass · default: The title, the table headers and the cells share one sans family, and the title and headers are set apart only by weight and size, so "hierarchy comes from size and weight, not from a second face."
- hierarchy · run 3 · pass · default: The title "Streamline your payroll" and the table headers stand apart from body rows through size and weight in a single sans family, matching "hierarchy comes from size and weight, not from a second face."
- density · run 1 · pass · default: This admin table uses compact rows of about 46px, small body text and tight page padding, matching "Admin screens are dense."
- density · run 2 · pass · default: The admin table has tight rows of about 46px, compact 14px text and a small footer control, matching "Admin screens are dense."
- density · run 3 · pass · default: Tight rows of about 46px, 14px body text and a compact footer give the admin a working table, as "Admin screens are dense."
- accent · run 1 · pass · default: No berry appears on anything decorative; the only action, Pay selected, is in a quiet disabled grey with nothing selected, which is consistent with "a dusty berry for primary actions, selection and focus only."
- accent · run 2 · pass · default: No berry appears anywhere: the disabled Pay selected button is a quiet neutral and nothing is selected, so nothing breaks "a dusty berry for primary actions, selection and focus only."
- accent · run 3 · pass · default: No heather appears decoratively: the disabled Pay selected button is a flat neutral and the status tags use amber, consistent with "a dusty berry for primary actions, selection and focus only."
- elevation · run 1 · pass · default: The table frame is separated from the page by a hairline border with no visible shadow, respecting "A shadow means "this floats", never "this is a box"."
- elevation · run 2 · pass · default: The table frame sits flat on the page with only a hairline edge and no shadow, consistent with "A shadow means "this floats", never "this is a box"."
- elevation · run 3 · pass · default: The table card sits flat with a hairline border and no shadow, so nothing contradicts "A shadow means "this floats", never "this is a box"."
- copy · run 1 · fail · default: The page title reads "Streamline your payroll", a vague marketing line in place of the brief's "Pay invoices", which breaks "Copy is second person, active and specific".
- copy · run 1 · fail · empty: The page header reads "Streamline your payroll", a vague marketing slogan instead of the screen's task title "Pay invoices", which breaks "Copy is second person, active and specific" even though the empty-state lines are plain.
- copy · run 1 · fail · payment-scheduled: The page title reads "Streamline your payroll", a vague marketing slogan where the screen brief asked for "Pay invoices", which breaks "Copy is second person, active and specific".
- copy · run 1 · fail · payment-failed: The toast is good, but the page title reads "Streamline your payroll" in place of the brief's "Pay invoices": a vague marketing line that breaks "Copy is second person, active and specific".
- copy · run 1 · fail · default, rows ticked: The page title reads "Streamline your payroll", a vague marketing slogan in place of the brief's "Pay invoices" title, breaking "Copy is second person, active and specific".
- copy · run 2 · fail · default: The page title reads "Streamline your payroll", a vague marketing line in place of the brief's specific "Pay invoices", which breaks "Copy is second person, active and specific".
- copy · run 2 · fail · empty: The page title reads "Streamline your payroll", a vague marketing line in place of the brief's "Pay invoices", which falls short of "Copy is second person, active and specific".
- copy · run 2 · fail · payment-scheduled: The page header reads "Streamline your payroll", a vague marketing tagline instead of the brief's "Pay invoices", which breaks "Copy is second person, active and specific".
- copy · run 2 · fail · payment-failed: The toast copy explains the failure and the fix well, but the page title "Streamline your payroll" is a vague marketing slogan in place of the brief's "Pay invoices", breaking "Copy is second person, active and specific".
- copy · run 2 · fail · default, rows ticked: The page title reads "Streamline your payroll", a vague marketing line in place of the brief's "Pay invoices", which breaks "Copy is second person, active and specific" even though "Pay selected" and "3 invoices selected" are fine.
- copy · run 3 · fail · default: The page title reads "Streamline your payroll", a vague marketing line in place of the screen brief's "Pay invoices", which breaks "Copy is second person, active and specific".
- copy · run 3 · fail · empty: The header reads "Streamline your payroll", a vague marketing line in place of the brief's "Pay invoices" title, which breaks "Copy is second person, active and specific".
- copy · run 3 · fail · payment-scheduled: The page title reads "Streamline your payroll", a vague marketing slogan in place of the brief's "Pay invoices", which breaks "Copy is second person, active and specific".
- copy · run 3 · fail · payment-failed: The error toast is good: it says the payment didn't go through and to check the funding account. But the page title reads "Streamline your payroll", a vague marketing tagline in place of the brief's "Pay invoices", which breaks "Copy is second person, active and specific".
- copy · run 3 · fail · default, rows ticked: The page title reads "Streamline your payroll", a vague marketing slogan in place of the brief's "Pay invoices" that says nothing about this task, which breaks "Copy is second person, active and specific".
- repetition · run 1 · pass · default: Each row states its status only once, in its "Awaiting" tag, with no echo in other cells, satisfying "Say a thing once: a card doesn't repeat "Overdue" in its title, its tag and its text."
- repetition · run 2 · pass · default: Each row states its status once, in its "Awaiting" tag, and the footer says the selection once, so the screen follows "Say a thing once: a card doesn't repeat "Overdue" in its title, its tag and its text."
- repetition · run 3 · pass · default: Each row states its status once in an "Awaiting" tag, and the footer says "No invoices selected" once, honouring "Say a thing once: a card doesn't repeat "Overdue" in its title, its tag and its text."

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

- hierarchy · run 1 · pass · default: One sans family carries everything: the 600-weight "Pay invoices" title and the 600 muted headers stand out by size and weight alone, so "hierarchy comes from size and weight, not from a second face."
- hierarchy · run 2 · pass · default: The "Pay invoices" title and the muted column headers stand apart through larger size and 600 weight in one sans family, so "hierarchy comes from size and weight, not from a second face."
- hierarchy · run 3 · pass · default: The "Pay invoices" title stands apart from the table by size and weight alone, with headers and cells in the same sans family, so "hierarchy comes from size and weight, not from a second face."
- density · run 1 · fail · default: On this admin screen rows sit about 60px apart, body text looks about 16px and the page inset is about 36px, which is the contractor's full room, not the admin's 46px rows, breaking "Admin screens are dense."
- density · run 1 · fail · empty: This admin screen sits about 36px in from the page edge, and its empty-state body text looks about 16px, which are the contractor values rather than the admin's 28px padding and 14px text, so it misses "Admin screens are dense."
- density · run 1 · fail · payment-scheduled: This admin screen renders rows and the header row about 60px tall, body text near 16px and about 36px page padding, which is the contractor's full-room spacing, so it breaks "Admin screens are dense."
- density · run 1 · fail · payment-failed: This admin screen renders at contractor sizing: rows are about 60px apart, the Pay selected button is about 44px tall, page padding is about 36px and body text looks like 16px, which breaks "Admin screens are dense."
- density · run 1 · fail · default, rows ticked: This admin screen renders 60px rows and a roughly 44px "Pay selected" button, which are the contractor sizes, not the 46px rows and 32px controls of working density, so it breaks "Admin screens are dense."
- density · run 2 · fail · default: This admin table uses rows about 60px tall and 36px page padding, the contractor's full-room values rather than 46px and 28px, which breaks "Admin screens are dense."
- density · run 2 · fail · empty: This admin screen sits about 36px in from the page edge and its body line reads near 16px, which matches the contractor column rather than the admin's 28px padding and 14px text, so it misses "Admin screens are dense."
- density · run 2 · fail · payment-scheduled: This is an admin screen, yet its header and body rows measure about 60px with roughly 16px text and 36px page padding, which is the contractor's full-room spacing and breaks "Admin screens are dense."
- density · run 2 · fail · payment-failed: This is an admin screen, but rows are about 60px tall, body text looks about 16px and the page padding is about 36px: contractor spacing where "Admin screens are dense."
- density · run 2 · fail · default, rows ticked: This admin screen uses rows of about 60px, roughly 16px body text and about 36px page padding, which is the contractor's full-room spacing; it breaks "Admin screens are dense."
- density · run 3 · fail · default: Body and header rows measure about 60px, and the page padding is about 36px, which matches the contractor column rather than the admin's 46px rows and 28px padding, so this admin screen breaks "Admin screens are dense."
- density · run 3 · fail · empty: This admin screen shows contractor spacing: about 36px page padding, body text that measures near 16px, and roomy, softly rounded card corners, so it misses the brief's "Admin screens are dense."
- density · run 3 · fail · payment-scheduled: This admin screen uses roughly 60px rows, about 16px body text, 36px page padding and a 44px Pay selected button, which is contractor sizing, when the brief says "Admin screens are dense."
- density · run 3 · fail · payment-failed: This is an admin screen, but its rows and header are about 60px tall, the page padding is about 36px and the body text is near 16px, which is contractor room rather than the working density that "Admin screens are dense." calls for.
- density · run 3 · fail · default, rows ticked: This admin screen uses contractor-sized spacing: rows and the header are about 60px tall, the "Pay selected" button is about 44px tall, and the page padding is about 36px, which breaks "Admin screens are dense."
- accent · run 1 · pass · default: No berry appears: the Pay selected button shows in a quiet disabled fill with nothing selected, and checkboxes and status tags don't borrow the accent, consistent with "a dusty berry for primary actions, selection and focus only."
- accent · run 2 · pass · default: No heather appears anywhere: the disabled "Pay selected" button has a flat neutral fill and nothing is selected, which is consistent with "a dusty berry for primary actions, selection and focus only."
- accent · run 3 · pass · default: Heather appears nowhere on this screen: the disabled "Pay selected" button is a flat neutral and the status tags use amber, which is consistent with "a dusty berry for primary actions, selection and focus only."
- elevation · run 1 · pass · default: The table frame sits flat on the page, separated by a hairline rather than a shadow, honouring "A shadow means "this floats", never "this is a box"."
- elevation · run 2 · pass · default: The table frame is flat, edged by a hairline with no shadow, which fits "A shadow means "this floats", never "this is a box"."
- elevation · run 3 · pass · default: The table card sits flat on the page, outlined by a hairline with no shadow, which respects "A shadow means "this floats", never "this is a box"."
- copy · run 1 · pass · default: The visible copy is short and specific ("Pay selected", "No invoices selected") and no error is shown, so nothing breaks "Copy is second person, active and specific".
- copy · run 2 · pass · default: The footer copy "No invoices selected" and the "Pay selected" button are plain, active and specific, with no error shown, satisfying "Copy is second person, active and specific".
- copy · run 3 · pass · default: The visible copy ("Pay selected", "No invoices selected") is short, active and specific, there is no error on screen, and nothing contradicts "Copy is second person, active and specific".
- repetition · run 1 · pass · default: Each row states its status once, in its Awaiting tag, without echoing it elsewhere in the row, matching "Say a thing once: a card doesn't repeat "Overdue" in its title, its tag and its text."
- repetition · run 2 · pass · default: Each row states its status once, in the "Awaiting" tag, and nowhere else, in line with "Say a thing once: a card doesn't repeat "Overdue" in its title, its tag and its text."
- repetition · run 3 · pass · default: Each row states "Awaiting" only once, in its status tag, which follows "Say a thing once: a card doesn't repeat "Overdue" in its title, its tag and its text."

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

- hierarchy · run 1 · fail · default: The "My invoices" title renders as small, muted, regular-weight text, smaller and lighter than the bold table headers, so the screen's top-level hierarchy is inverted, though the brief says "hierarchy comes from size and weight, not from a second face."
- hierarchy · run 1 · fail · empty: The "My invoices" heading renders small, regular-weight and muted, weaker than the bold "No invoices yet" inside the card, so the page title doesn't lead as "hierarchy comes from size and weight, not from a second face" requires.
- hierarchy · run 1 · fail · default, sheet open: The sheet sets its title and the large "$4,800.00" apart with size and weight in one family, but the page heading "My invoices" renders small, regular-weight and muted, lighter than the table headers beneath it, so the page title has no hierarchy from "size and weight".
- hierarchy · run 2 · fail · default: The "My invoices" title renders as small, regular-weight muted text, smaller and lighter than the bold column headers, so the screen breaks "hierarchy comes from size and weight, not from a second face."
- hierarchy · run 2 · fail · empty: The "My invoices" Heading renders as small, regular-weight muted text, smaller and lighter than the bold "No invoices yet" inside the card, so the page title doesn't lead; this breaks "hierarchy comes from size and weight, not from a second face."
- hierarchy · run 2 · fail · default, sheet open: In the sheet, size and weight set the title, the 32px figure and the body text apart. But the screen's "My invoices" title renders small, regular weight and muted, like body text rather than a 600-weight title, so "hierarchy comes from size and weight, not from a second face" isn't carried at the page level.
- hierarchy · run 3 · fail · default: The "My invoices" Heading renders as small, regular-weight muted text, lighter and no larger than the 600-weight table headers, so the title has no rank; the brief says "hierarchy comes from size and weight, not from a second face" and titles should be 24px and up at 600.
- hierarchy · run 3 · fail · empty: The page Heading "My invoices" renders small, regular-weight and muted, smaller and lighter than the bold "No invoices yet" beneath it, so the screen title doesn't lead, although "hierarchy comes from size and weight, not from a second face."
- hierarchy · run 3 · fail · default, sheet open: In the sheet, the 32px semibold amount and semibold invoice number set the order well, but the page Heading "My invoices" renders small, regular-weight and muted, lighter than the semibold column headers, so the title doesn't lead as "hierarchy comes from size and weight, not from a second face" asks.
- density · run 1 · pass · default: Rows are about 60px tall with 16px body text and roomy page padding, matching "Contractor screens have room."
- density · run 2 · pass · default: Rows are about 60px tall, with roughly 36px page padding and 16px body text, matching "Contractor screens have room."
- density · run 3 · pass · default: Rows sit at about 60px with roughly 36px of page padding and roomy text, matching "Contractor screens have room."
- accent · run 1 · pass · default: No heather appears anywhere on this read-only table, which is consistent with "a dusty berry for primary actions, selection and focus only."
- accent · run 2 · pass · default: No heather appears; status tags use their own red and blue and nothing borrows the accent, consistent with "a dusty berry for primary actions, selection and focus only."
- accent · run 3 · pass · default: No heather appears; status tags use their own red and blue, consistent with "a dusty berry for primary actions, selection and focus only."
- elevation · run 1 · pass · default: The table frame is a flat surface with a hairline border and no shadow, in line with "A shadow means "this floats", never "this is a box"."
- elevation · run 2 · pass · default: The table frame is separated by a hairline border with no shadow, honouring "A shadow means "this floats", never "this is a box"."
- elevation · run 3 · pass · default: The table frame is a hairline-bordered flat surface with no shadow, respecting "A shadow means "this floats", never "this is a box"."
- copy · run 1 · pass · default: The only copy is the brief-given title and plain data, and there is no error to judge against "Copy is second person, active and specific".
- copy · run 2 · pass · default: The only copy is the brief-given title, column headers and data, with no error to judge against "Errors say what happened and what to do next."
- copy · run 3 · pass · default: The only copy is the brief-given title and plain column headers, and with no errors shown nothing breaks "Copy is second person, active and specific".
- repetition · run 1 · pass · default: Each status appears only once, in its tag, honouring "Say a thing once: a card doesn't repeat "Overdue" in its title, its tag and its text."
- repetition · run 2 · pass · default: Each row states its status once, in its tag only, in line with "Say a thing once: a card doesn't repeat "Overdue" in its title, its tag and its text."
- repetition · run 3 · pass · default: Each row states its status once in its tag, with no echo elsewhere, following "Say a thing once: a card doesn't repeat "Overdue" in its title, its tag and its text."
