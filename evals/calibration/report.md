# Brief conformance calibration

Written by `pnpm evals:calibrate` (ADR 0014) on 2026-10-31, at `e184fe3`. The judge is claude-opus-5-5 at effort high, prompt `a196ad07bd4a`. The calibration set's 8 screens, 3 kept screens as they are and 5 broken copies, have 33 screen states, and each was judged 3 times. It cost $2.50.

## Right verdicts and flips

A screen's verdict on a criterion in one run fails when any of its states fails it. It's right when a kept screen passes, and when a broken copy fails the criterion it breaks and passes the rest. A screen's criterion flipped when its verdicts differ between runs.

| Criterion | Right | Flipped |
| --- | --- | --- |
| hierarchy | 24/24 (100%) | 0/8 (0%) |
| density | 24/24 (100%) | 0/8 (0%) |
| accent | 24/24 (100%) | 0/8 (0%) |
| elevation | 24/24 (100%) | 0/8 (0%) |
| copy | 24/24 (100%) | 0/8 (0%) |
| repetition | 24/24 (100%) | 0/8 (0%) |
| **All** | 144/144 (100%) | 0/48 (0%) |

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

- hierarchy · run 1 · pass · default: The "Pay invoices" title is set larger and heavier than the body, and the table headers differ only by weight and muted colour, all in one sans family, so "hierarchy comes from size and weight, not from a second face."
- hierarchy · run 2 · pass · default: One sans family carries everything, with the 600-weight "Pay invoices" title larger than the 600-weight muted headers and 400-weight body, so "hierarchy comes from size and weight, not from a second face."
- hierarchy · run 3 · pass · default: The "Pay invoices" title stands apart through larger size and heavier weight, and the column headers use weight and muted colour in the same sans family, so "hierarchy comes from size and weight, not from a second face."
- density · run 1 · pass · default: Rows sit about 46px apart with roughly 28px of page padding and compact 14px text, matching "Admin screens are dense."
- density · run 2 · pass · default: Rows sit at about 46px with 14px text and roughly 28px page padding, matching "Admin screens are dense."
- density · run 3 · pass · default: Rows are about 46px tall with compact 14px text and roughly 28px page padding, which fits "Admin screens are dense."
- accent · run 1 · pass · default: No heather appears anywhere: the disabled "Pay selected" button is a flat neutral and no rows are selected, so nothing breaks "a dusty berry for primary actions, selection and focus only."
- accent · run 2 · pass · default: No heather appears decoratively: the unchecked checkboxes are neutral and the disabled Pay selected button is a flat neutral, consistent with "a dusty berry for primary actions, selection and focus only."
- accent · run 3 · pass · default: No berry appears on this state: the only action, the disabled Pay selected button, is a quiet neutral and no row is selected, so nothing breaks "a dusty berry for primary actions, selection and focus only."
- elevation · run 1 · pass · default: The table frame is separated from the page by a hairline with no visible shadow, consistent with "A shadow means "this floats", never "this is a box"."
- elevation · run 2 · pass · default: The table frame is separated from the page by a hairline with no shadow, respecting "A shadow means "this floats", never "this is a box"."
- elevation · run 3 · pass · default: The table frame is flat, separated by a hairline border with no shadow, which honours "A shadow means "this floats", never "this is a box"."
- copy · run 1 · pass · default: The visible copy, "Pay selected" and "No invoices selected", is plain and specific with no error on screen, meeting "Copy is second person, active and specific".
- copy · run 2 · pass · default: The visible copy, "No invoices selected" and "Pay selected", is the brief's own, and there is no error state to judge against "Errors say what happened and what to do next."
- copy · run 3 · pass · default: The visible copy ("Pay selected", "No invoices selected") is plain and specific, there is no error to judge, and nothing contradicts "Copy is second person, active and specific".
- repetition · run 1 · pass · default: Each row states its status once in the "Awaiting" tag, with no duplicate wording in other cells, honouring "Say a thing once: a card doesn't repeat "Overdue" in its title, its tag and its text."
- repetition · run 2 · pass · default: Each row states its status once in an Awaiting tag, with no duplicate status text elsewhere, honouring "Say a thing once: a card doesn't repeat "Overdue" in its title, its tag and its text."
- repetition · run 3 · pass · default: Each row states its status once in the Awaiting tag, without repeating it elsewhere in the row, in line with "Say a thing once: a card doesn't repeat "Overdue" in its title, its tag and its text."

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

- hierarchy · run 1 · pass · default: The "My invoices" title stands apart from the table through larger size and 600 weight in the same sans family, with headers set apart by weight and muted colour, so "hierarchy comes from size and weight, not from a second face."
- hierarchy · run 2 · pass · default: The "My invoices" title and the muted header row stand apart from the body rows through larger size and 600 weight in the same sans family, so "hierarchy comes from size and weight, not from a second face."
- hierarchy · run 3 · pass · default: The "My invoices" title stands apart from the table by larger size and 600 weight, and headers differ by weight and muted colour in the same sans face, so "hierarchy comes from size and weight, not from a second face".
- density · run 1 · pass · default: Rows sit at about 60px with roughly 16px text and 36px page padding, giving the contractor the roomy layout the brief asks for in "Contractor screens have room."
- density · run 2 · pass · default: This is a contractor screen with rows about 60px tall, roomy page padding and comfortable text, so "Contractor screens have room."
- density · run 3 · pass · default: Rows measure about 60px and the page padding is about 36px, so this contractor table has the roomy spacing the brief asks for in "Contractor screens have room."
- accent · run 1 · pass · default: No heather appears anywhere, and the status tags use their own red and blue, consistent with "a dusty berry for primary actions, selection and focus only" on a read-only screen with nothing selected or focused.
- accent · run 2 · pass · default: No heather appears on this read-only screen, and the status tags use their own red and blue, consistent with "a dusty berry for primary actions, selection and focus only."
- accent · run 3 · pass · default: No heather appears anywhere on this read-only table, and status tags use their own red and blue, so nothing misuses "a dusty berry for primary actions, selection and focus only."
- elevation · run 1 · pass · default: The table frame is separated from the page by a hairline border with no drop shadow, honouring "A shadow means "this floats", never "this is a box"."
- elevation · run 2 · pass · default: The table frame is set off by a hairline border with no shadow, which honours "A shadow means "this floats", never "this is a box"."
- elevation · run 3 · pass · default: The table frame sits flat on the page with a hairline edge and no shadow, which honours "A shadow means "this floats", never "this is a box"."
- copy · run 1 · pass · default: The only copy is the brief-given title "My invoices" and plain column headers, and no error appears, so nothing breaks "Copy is second person, active and specific".
- copy · run 2 · pass · default: The only copy is the brief-given title "My invoices" and plain column labels; there is no error to judge, so nothing breaks "Copy is second person, active and specific".
- copy · run 3 · pass · default: The only copy is the brief-given title "My invoices", plain column headers and the status words, with no error on screen, so nothing breaks "Copy is second person, active and specific".
- repetition · run 1 · pass · default: Each status appears once, as its tag only, with no title or text echoing "Overdue", in line with "Say a thing once: a card doesn't repeat "Overdue" in its title, its tag and its text."
- repetition · run 2 · pass · default: Each row states its status once, in a single tag such as "Overdue" or "Scheduled", which satisfies "Say a thing once: a card doesn't repeat "Overdue" in its title, its tag and its text."
- repetition · run 3 · pass · default: Each status, such as Overdue, appears once in its row's tag and nowhere else in that row, meeting "Say a thing once: a card doesn't repeat "Overdue" in its title, its tag and its text."

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

- hierarchy · run 1 · pass · default: The page title, the large "$4,800.00" figure and the invoice number are set apart by size and weight within one sans family, matching "hierarchy comes from size and weight, not from a second face."
- hierarchy · run 2 · pass · default: The title, invoice number and large $4,800.00 figure are set apart by size and weight within one sans family, so "hierarchy comes from size and weight, not from a second face."
- hierarchy · run 3 · pass · default: The page title, the invoice number and the large "$4,800.00" figure are set apart by size and weight in one sans family, matching "hierarchy comes from size and weight, not from a second face."
- density · run 1 · pass · default: This contractor card has roomy padding around the page and inside the card, readable body text and a full-height Send reminder button, consistent with "Contractor screens have room."
- density · run 2 · pass · default: The contractor card has generous padding, a roughly 44px full-width button and about 36px page padding, matching "Contractor screens have room."
- density · run 3 · pass · default: The contractor view has generous page padding, roughly 16px body text and a 44px-tall full-width button, so "Contractor screens have room."
- accent · run 1 · pass · default: The berry fill appears only on the primary Send reminder button, while the Overdue tag uses its own red, matching "a dusty berry for primary actions, selection and focus only."
- accent · run 2 · pass · default: The dusty berry appears only on the primary Send reminder button, while the Overdue tag uses its own red, consistent with "a dusty berry for primary actions, selection and focus only."
- accent · run 3 · pass · default: Heather appears only on the primary "Send reminder" button, and the Overdue tag uses its own red, which keeps the accent to "a dusty berry for primary actions, selection and focus only."
- elevation · run 1 · pass · default: The card sits flat on the page with a hairline border and no shadow, in line with "A shadow means "this floats", never "this is a box"."
- elevation · run 2 · pass · default: The card sits flat on the page, separated by a hairline border with no shadow, honouring "A shadow means "this floats", never "this is a box"."
- elevation · run 3 · pass · default: The card sits flat on the page, separated by a hairline border with no shadow, consistent with "A shadow means "this floats", never "this is a box"."
- copy · run 1 · pass · default: The visible copy ("Send reminder", "Due Oct 8") is active and specific, and no error appears, so "Copy is second person, active and specific" is met.
- copy · run 2 · pass · default: The visible copy ("Send reminder", "Due Oct 8") is active and specific, and there is no error state shown, so "Copy is second person, active and specific" is met as far as the screen shows.
- copy · run 3 · pass · default: The visible copy ("Send reminder", "Due Oct 8") is active and specific, and no error is shown here, so "Copy is second person, active and specific" is met.
- repetition · run 1 · pass · default: "Overdue" appears only in the status tag, not in the title or the body text, meeting "Say a thing once: a card doesn't repeat "Overdue" in its title, its tag and its text."
- repetition · run 2 · pass · default: "Overdue" appears only in the status tag, not in the title or body text, following "Say a thing once: a card doesn't repeat "Overdue" in its title, its tag and its text."
- repetition · run 3 · pass · default: "Overdue" appears only in the status tag, not in the title or the body text, honouring "Say a thing once: a card doesn't repeat "Overdue" in its title, its tag and its text."

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

- hierarchy · run 1 · pass · default: The title, invoice number, large amount and body lines all appear in one sans family and are set apart only by size and weight, so "hierarchy comes from size and weight, not from a second face."
- hierarchy · run 2 · pass · default: One sans family carries everything, and the 600-weight "Payment status" title and large $4,800.00 figure stand apart from the 400 body lines, so "hierarchy comes from size and weight, not from a second face."
- hierarchy · run 3 · pass · default: One sans family is used throughout, and the title, the large $4,800.00 figure and the body lines are set apart by size and weight, so "hierarchy comes from size and weight, not from a second face."
- density · run 1 · pass · default: For the contractor, the card has generous padding, roughly 44px buttons and 16px body text, matching "Contractor screens have room."
- density · run 2 · pass · default: The contractor card has generous padding, 16px body text and roughly 44px buttons, matching "Contractor screens have room."
- density · run 3 · pass · default: The contractor view has about 36px page padding, 44px-tall buttons, 16px body text and generous card spacing, matching "Contractor screens have room."
- accent · run 1 · fail · default: Both "Send reminder" and the secondary "Download invoice" are filled in heather, so the accent marks a non-primary action and breaks "a dusty berry for primary actions, selection and focus only."
- accent · run 1 · fail · reminder-failed: Both "Send reminder" and the secondary "Download invoice" are filled in heather, so the accent is no longer reserved for "a dusty berry for primary actions, selection and focus only."
- accent · run 2 · fail · default: Both "Send reminder" and the secondary "Download invoice" are filled heather, so the accent no longer marks the one primary action, against "a dusty berry for primary actions, selection and focus only."
- accent · run 2 · fail · reminder-failed: Both "Send reminder" and the secondary "Download invoice" are filled with heather, so the accent marks a non-primary action too, against "a dusty berry for primary actions, selection and focus only."
- accent · run 3 · fail · default: Both "Send reminder" and the secondary "Download invoice" are filled in heather, so the accent is no longer reserved for the one primary action, breaking "a dusty berry for primary actions, selection and focus only."
- accent · run 3 · fail · reminder-failed: Both "Send reminder" and the secondary "Download invoice" are filled heather, so the accent no longer marks just the one primary action, against "a dusty berry for primary actions, selection and focus only."
- elevation · run 1 · pass · default: The card sits flat on the page with a hairline border and no shadow, consistent with "A shadow means "this floats", never "this is a box"."
- elevation · run 2 · pass · default: The card sits flat on the page with a hairline border and no shadow, consistent with "A shadow means "this floats", never "this is a box"."
- elevation · run 3 · pass · default: The card is flat on the page with only a hairline border and no shadow, consistent with "A shadow means "this floats", never "this is a box"."
- copy · run 1 · pass · default: The visible copy, "Send reminder", "Download invoice" and "Due Oct 8", is active and specific, there is no error copy to judge, and it meets "Copy is second person, active and specific".
- copy · run 2 · pass · default: The copy is short and specific ("Send reminder", "Due Oct 8") with no error on screen, meeting "Copy is second person, active and specific".
- copy · run 3 · pass · default: The visible copy ("Send reminder", "Download invoice", "Due Oct 8") is active and specific, and no error is shown, meeting "Copy is second person, active and specific".
- repetition · run 1 · pass · default: "Overdue" appears only in the status tag, not in the title or the text, honouring "Say a thing once: a card doesn't repeat "Overdue" in its title, its tag and its text."
- repetition · run 2 · pass · default: "Overdue" appears only in the status tag, not in the title or the body text, so the card follows "Say a thing once: a card doesn't repeat "Overdue" in its title, its tag and its text."
- repetition · run 3 · pass · default: "Overdue" appears only in the status tag, not in the title or the body text, following "Say a thing once: a card doesn't repeat "Overdue" in its title, its tag and its text."

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

- hierarchy · run 1 · pass · default: One sans family carries everything, with the title and "$4,800.00" set apart by larger size and heavier weight, so "hierarchy comes from size and weight, not from a second face."
- hierarchy · run 2 · pass · default: One sans family carries everything; the 600-weight "Payment status" title and large "$4,800.00" figure stand out from the 400-weight due date and client line by size and weight alone, honouring "hierarchy comes from size and weight, not from a second face."
- hierarchy · run 3 · pass · default: The title, the large $4,800.00 figure and the muted client line differ only in size and weight within one sans family, so "hierarchy comes from size and weight, not from a second face."
- density · run 1 · pass · default: The contractor screen has generous page padding, a tall full-width button of about 44px, roomy card padding and comfortable body text, matching "Contractor screens have room."
- density · run 2 · pass · default: This contractor view has roomy spacing: about 36px page padding, a full-height 44px Send reminder button, 16px body text and generous card padding, matching "Contractor screens have room."
- density · run 3 · pass · default: This contractor screen has generous page padding, roomy card spacing and a full-height 44px button, matching "Contractor screens have room."
- accent · run 1 · pass · default: Heather appears only on the primary "Send reminder" button, while the tag uses status red, matching "a dusty berry for primary actions, selection and focus only."
- accent · run 2 · pass · default: The heather fill appears only on the primary Send reminder button, and the Overdue tag uses its own red, consistent with "a dusty berry for primary actions, selection and focus only."
- accent · run 3 · pass · default: The heather fill appears only on the primary Send reminder button, and the Overdue tag uses red, consistent with "a dusty berry for primary actions, selection and focus only."
- elevation · run 1 · fail · default: The card sits flat on the page in the default state but shows a soft drop shadow along its lower edge on top of its hairline border, which breaks "A shadow means "this floats", never "this is a box"."
- elevation · run 1 · fail · reminder-sent: The invoice card sits flat on the page yet shows a soft drop shadow beneath its hairline border, using a shadow to mark a box against "A shadow means "this floats", never "this is a box"."
- elevation · run 2 · fail · reminder-sent: The invoice card sits flat in the page with its hairline border, yet it also carries a soft drop shadow, which breaks "A shadow means "this floats", never "this is a box"."
- elevation · run 3 · fail · default: The static invoice card sits flat on the page yet carries a soft drop shadow under its hairline border, which breaks "A shadow means "this floats", never "this is a box"."
- copy · run 1 · pass · default: The visible copy ("Send reminder", "Due Oct 8") is active and specific, and no error is shown, so "Copy is second person, active and specific" holds.
- copy · run 2 · pass · default: The visible copy ("Send reminder", "Due Oct 8") is active and specific with no vague timing, and no error is shown in this default state, meeting "Copy is second person, active and specific".
- copy · run 3 · pass · default: The visible copy ("Send reminder", "Due Oct 8") is active and specific, and with no error on screen nothing breaks "Copy is second person, active and specific".
- repetition · run 1 · pass · default: "Overdue" appears only in the status tag, while the title is the invoice number and the text gives the due date, honouring "Say a thing once: a card doesn't repeat "Overdue" in its title, its tag and its text."
- repetition · run 2 · pass · default: "Overdue" appears only in the status tag, not in the title or body text, following "Say a thing once: a card doesn't repeat "Overdue" in its title, its tag and its text."
- repetition · run 3 · pass · default: "Overdue" appears only in the status tag, with no echo in the title or the due line, honouring "Say a thing once: a card doesn't repeat "Overdue" in its title, its tag and its text."

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

- hierarchy · run 1 · pass · default: One sans family carries everything, and the title stands apart only by its larger semibold size while the table headers use weight and muted colour, so "hierarchy comes from size and weight, not from a second face".
- hierarchy · run 2 · pass · default: The title "Streamline your payroll" stands apart from the table by larger size and 600 weight in the same sans, and the headers use weight and muted colour, so "hierarchy comes from size and weight, not from a second face."
- hierarchy · run 3 · pass · default: The 24px-scale title "Streamline your payroll" and the muted 600-weight table headers stand apart from the 400-weight body rows in one sans family, so "hierarchy comes from size and weight, not from a second face."
- density · run 1 · pass · default: Rows are about 46px with 14px body text and a compact footer button on this admin table, matching "Admin screens are dense."
- density · run 2 · pass · default: Rows sit at about 46px with 14px text and tight padding, which fits "Admin screens are dense."
- density · run 3 · pass · default: Rows are about 46px tall, the body text is 14px and the page padding is about 28px, which fits the brief's line that "Admin screens are dense."
- accent · run 1 · pass · default: No berry is spent on decoration: the disabled Pay selected button is a flat neutral and the status tags use amber, consistent with "a dusty berry for primary actions, selection and focus only."
- accent · run 2 · pass · default: No berry appears in the status tags, headers or text, and the disabled Pay selected button uses a flat neutral, consistent with "a dusty berry for primary actions, selection and focus only."
- accent · run 3 · pass · default: No heather shows anywhere: the Pay selected button is in a quiet disabled grey, the checkboxes are unticked and the status tags use amber, which is consistent with "a dusty berry for primary actions, selection and focus only."
- elevation · run 1 · pass · default: The table sits flat on the page, separated by a hairline border with no shadow, so nothing breaks "A shadow means "this floats", never "this is a box"."
- elevation · run 2 · pass · default: The table frame is flat and separated by a hairline with no shadow, so nothing breaks "A shadow means "this floats", never "this is a box"."
- elevation · run 3 · pass · default: The table frame is flat on the page and separated by a hairline with no shadow, matching "A shadow means "this floats", never "this is a box"."
- copy · run 1 · fail · default: The page title reads "Streamline your payroll", which is vague marketing language rather than a plain, specific label for the task of paying invoices, falling short of "Copy is second person, active and specific".
- copy · run 1 · fail · empty: The header reads "Streamline your payroll", a vague marketing line in place of the brief's specific "Pay invoices" title, which breaks "Copy is second person, active and specific" even though the empty-state lines are plain.
- copy · run 1 · fail · payment-scheduled: The page title reads "Streamline your payroll", a vague marketing line in place of the brief's "Pay invoices" title, which breaks "Copy is second person, active and specific" because it names no specific task.
- copy · run 1 · fail · payment-failed: The toast is good, but the page header reads as the vague marketing line "Streamline your payroll" instead of naming the task, which breaks "Copy is second person, active and specific".
- copy · run 1 · fail · default, rows ticked: The page title reads "Streamline your payroll", a vague marketing slogan instead of the brief's "Pay invoices", which breaks "Copy is second person, active and specific".
- copy · run 2 · fail · default: The page title reads "Streamline your payroll", a vague marketing line instead of the brief's "Pay invoices", which breaks "Copy is second person, active and specific".
- copy · run 2 · fail · empty: The page title reads "Streamline your payroll", a vague marketing line in place of the specific "Pay invoices" that the screen brief asks for, which breaks "Copy is second person, active and specific".
- copy · run 2 · fail · payment-scheduled: The screen replaces the brief's "Pay invoices" title with the vague slogan "Streamline your payroll", which says nothing about the task and breaks "Copy is second person, active and specific".
- copy · run 2 · fail · payment-failed: The failure toast follows "Errors say what happened and what to do next." with "Check your funding account, then try again", but the page title "Streamline your payroll" is a vague marketing slogan in place of the brief's "Pay invoices", which breaks "Copy is second person, active and specific".
- copy · run 2 · fail · default, rows ticked: The header reads "Streamline your payroll", vague marketing copy in place of the brief's "Pay invoices", which breaks "Copy is second person, active and specific".
- copy · run 3 · fail · default: The page title reads "Streamline your payroll", a vague marketing line in place of the task-specific "Pay invoices", which breaks "Copy is second person, active and specific".
- copy · run 3 · fail · empty: The page title reads "Streamline your payroll", a vague marketing line in place of the brief's "Pay invoices", which breaks "Copy is second person, active and specific".
- copy · run 3 · fail · payment-scheduled: The page title reads "Streamline your payroll", which is vague marketing copy rather than the task the screen does, failing "Copy is second person, active and specific".
- copy · run 3 · fail · payment-failed: The error toast is good, but the page title reads "Streamline your payroll", a vague marketing slogan in place of a task title, which breaks "Copy is second person, active and specific".
- copy · run 3 · fail · default, rows ticked: The page title reads "Streamline your payroll", a vague marketing line in place of the brief's "Pay invoices" title, which breaks "Copy is second person, active and specific".
- repetition · run 1 · pass · default: Each row states its status once, in its "Awaiting" tag, and repeats it nowhere else, honouring "Say a thing once: a card doesn't repeat "Overdue" in its title, its tag and its text."
- repetition · run 2 · pass · default: Each row shows its status only once, in its "Awaiting" tag, so the screen honours "Say a thing once: a card doesn't repeat "Overdue" in its title, its tag and its text."
- repetition · run 3 · pass · default: Each row states "Awaiting" only once, in its status tag, and the title and footer don't echo it, honouring "Say a thing once: a card doesn't repeat "Overdue" in its title, its tag and its text."

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

- hierarchy · run 1 · pass · default: The screen uses one sans family, with the "Pay invoices" title set apart by larger size and 600 weight and the headers by weight and muted colour, so "hierarchy comes from size and weight, not from a second face."
- hierarchy · run 2 · pass · default: The screen uses one sans family throughout, with the "Pay invoices" title set larger and heavier and the headers set apart by weight and muted colour, so "hierarchy comes from size and weight, not from a second face."
- hierarchy · run 3 · pass · default: The "Pay invoices" title stands apart through larger size and 600 weight in the same sans as the table, and the headers use weight and muted colour rather than a second face, so "hierarchy comes from size and weight, not from a second face."
- density · run 1 · fail · default: On this admin screen, rows, the header and the footer are about 60px tall, the Pay selected button is about 44px and the page padding is about 36px, which is the contractor's full-room sizing, so it breaks "Admin screens are dense."
- density · run 1 · fail · payment-scheduled: This is an admin screen, but rows and the header measure about 60px, page padding is about 36px and body text reads near 16px, which is the contractor's full room rather than working density, breaking "Admin screens are dense."
- density · run 1 · fail · payment-failed: This is an admin screen, yet it uses contractor sizing: rows about 60px tall, a 44px-high "Pay selected" button, roughly 16px body text and 36px page padding, which breaks "Admin screens are dense."
- density · run 1 · fail · default, rows ticked: This admin screen uses contractor spacing, with rows about 60px tall, a 44px-tall "Pay selected" button, about 36px page padding and roughly 16px body text, so it misses "Admin screens are dense."
- density · run 2 · fail · default: This admin table uses contractor sizing, with roughly 60px rows and header, about 36px page padding and body text near 16px, which breaks "Admin screens are dense."
- density · run 2 · fail · payment-scheduled: On this admin screen the rows and header are about 60px tall, page padding is about 36px and the Pay selected button is about 44px high, which is contractor sizing and breaks "Admin screens are dense."
- density · run 2 · fail · payment-failed: This admin screen has about 60px rows and header, roughly 16px body text and about 36px page padding, which is contractor room rather than working density, against "Admin screens are dense."
- density · run 2 · fail · default, rows ticked: This is an admin screen, yet the rows measure about 60px, the Pay selected button is about 44px tall and the page padding is about 36px, which is the contractor's full room, breaking "Admin screens are dense."
- density · run 3 · fail · default: This admin screen uses rows about 60px tall, body text that looks about 16px, and roughly 36px page padding, which are contractor measurements, so it misses "Admin screens are dense."
- density · run 3 · fail · empty: This admin empty state sits on a page inset of about 36px with body text near 16px and a softly rounded card, which matches the contractor column of the density table, not the 28px padding and 14px text the brief sets out under "Admin screens are dense."
- density · run 3 · fail · payment-scheduled: This admin screen has roughly 60px rows, a 44px-tall button, 36px page padding and 16px-looking body text, which is the contractor's full room, breaking "Admin screens are dense."
- density · run 3 · fail · payment-failed: This admin screen renders at contractor room: header and body rows are about 60px tall, the Pay selected button is about 44px high, page padding is about 36px and body text looks about 16px, so it breaks "Admin screens are dense."
- density · run 3 · fail · default, rows ticked: This admin table runs at about 60px rows, a roughly 44px-tall "Pay selected" button, about 16px body text and 36px page padding, which are the contractor's measurements, so it breaks "Admin screens are dense."
- accent · run 1 · pass · default: No berry appears anywhere: the disabled Pay selected button is a flat neutral and the unticked checkboxes are neutral, consistent with "a dusty berry for primary actions, selection and focus only."
- accent · run 2 · pass · default: No berry appears on the screen: the disabled Pay selected button has a flat neutral fill and the checkboxes are unticked, which is consistent with "a dusty berry for primary actions, selection and focus only."
- accent · run 3 · pass · default: No berry appears anywhere on screen: the Pay selected button shows a quiet disabled neutral fill and the checkboxes are unticked, so nothing misuses "a dusty berry for primary actions, selection and focus only."
- elevation · run 1 · pass · default: The table frame is separated from the page by a hairline with no shadow, and nothing on screen floats, which respects "A shadow means "this floats", never "this is a box"."
- elevation · run 2 · pass · default: The table frame is separated from the page by a hairline with no visible shadow, so nothing contradicts "A shadow means "this floats", never "this is a box"."
- elevation · run 3 · pass · default: The table sits flat on the page with a hairline border and no shadow, consistent with "A shadow means "this floats", never "this is a box"."
- copy · run 1 · pass · default: The visible copy is the brief's own ("No invoices selected", "Pay selected") and there is no error on screen, so nothing breaks "Copy is second person, active and specific".
- copy · run 2 · pass · default: The footer reads "No invoices selected" and the button reads "Pay selected", both plain and specific, and no error is shown, which meets "Copy is second person, active and specific".
- copy · run 3 · pass · default: The visible copy ("Pay selected", "No invoices selected") comes from the screen brief, and no error is shown, so nothing breaks "Copy is second person, active and specific".
- repetition · run 1 · pass · default: Each row states its status only once, in its "Awaiting" tag, with no echo in other cells, honouring "Say a thing once: a card doesn't repeat "Overdue" in its title, its tag and its text."
- repetition · run 2 · pass · default: Each row states its status once, in its "Awaiting" tag, with no echo elsewhere in the row, honouring "Say a thing once: a card doesn't repeat "Overdue" in its title, its tag and its text."
- repetition · run 3 · pass · default: Each row says its status once, in the "Awaiting" tag, and nothing else repeats it, meeting "Say a thing once: a card doesn't repeat "Overdue" in its title, its tag and its text."

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

- hierarchy · run 1 · fail · default: The "My invoices" heading renders small, regular-weight and muted, lighter than the 600-weight table headers beneath it, so the page title doesn't lead; this breaks "hierarchy comes from size and weight, not from a second face."
- hierarchy · run 1 · fail · empty: The page heading "My invoices" renders small, regular weight and muted, weaker than the empty state's bold "No invoices yet", so the title doesn't lead even though "hierarchy comes from size and weight, not from a second face".
- hierarchy · run 1 · fail · default, sheet open: In the sheet the number title and the large $4,800.00 figure use size and weight in one family, but the page heading "My invoices" behind the scrim renders at roughly body size in a light weight, quieter than the 600-weight table headers, so it doesn't follow "hierarchy comes from size and weight, not from a second face."
- hierarchy · run 2 · fail · default: The "My invoices" title renders as small, regular-weight muted text, no larger or bolder than the column headers below it, so the page title gets no prominence even though "hierarchy comes from size and weight, not from a second face."
- hierarchy · run 2 · fail · empty: The page title "My invoices" renders small, regular-weight and muted, lighter than the bold "No invoices yet" below it, so the screen's top heading doesn't lead when "hierarchy comes from size and weight, not from a second face."
- hierarchy · run 2 · fail · default, sheet open: The page title "My invoices" renders at roughly body size in a light regular weight, so it reads like a muted label rather than a title, which breaks "hierarchy comes from size and weight, not from a second face"; inside the sheet, the 600-weight amount and number do rank correctly.
- hierarchy · run 3 · fail · default: The "My invoices" heading renders small, regular-weight and muted, visually weaker than the 600-weight table headers, so the screen title gets none of the size and weight the brief relies on when "hierarchy comes from size and weight, not from a second face."
- hierarchy · run 3 · fail · empty: The page Heading "My invoices" renders small, regular weight and muted, visibly weaker than the bold "No invoices yet" inside the card, so the page title doesn't lead, breaking "hierarchy comes from size and weight, not from a second face."
- hierarchy · run 3 · fail · default, sheet open: The sheet uses size and weight well (600 title, large 600 amount, 400 body), but the page title "My invoices" renders small, regular and muted, weaker than the 600 table headers, so the screen's top-level hierarchy breaks the rule that "hierarchy comes from size and weight, not from a second face."
- density · run 1 · pass · default: Rows are about 60px tall with roughly 36px page padding and 16px body text, matching the contractor column, so "Contractor screens have room."
- density · run 2 · pass · default: Rows are about 60px tall, with roughly 36px page padding and 16px body text, matching "Contractor screens have room."
- density · run 3 · pass · default: Rows are about 60px tall, the page padding is about 36px and the body text is around 16px, matching "Contractor screens have room."
- accent · run 1 · pass · default: No heather appears anywhere, and the status tags use their own red and blue, consistent with "a dusty berry for primary actions, selection and focus only."
- accent · run 2 · pass · default: No heather appears anywhere; the only colour is in the status tags, consistent with an accent reserved for "a dusty berry for primary actions, selection and focus only."
- accent · run 3 · pass · default: No heather appears anywhere; the read-only screen has no primary action or selection, consistent with "a dusty berry for primary actions, selection and focus only."
- elevation · run 1 · pass · default: The table frame is separated by a hairline border with no shadow, respecting "A shadow means "this floats", never "this is a box"."
- elevation · run 2 · pass · default: The table frame is separated by a hairline border with no shadow, respecting "A shadow means "this floats", never "this is a box"."
- elevation · run 3 · pass · default: The table frame is flat on the page with a hairline border and no shadow, which respects "A shadow means "this floats", never "this is a box"."
- copy · run 1 · pass · default: The only copy is the brief-given title and plain column headers, with no error to judge, so nothing breaks "Copy is second person, active and specific".
- copy · run 2 · pass · default: The only copy is the brief-given title and plain column headers with no error states, so there is nothing that breaks "Copy is second person, active and specific".
- copy · run 3 · pass · default: The only copy is the brief-given title, column headers and data, with no error to judge against "Copy is second person, active and specific".
- repetition · run 1 · pass · default: Each row states its status once, in its tag, honouring "Say a thing once: a card doesn't repeat "Overdue" in its title, its tag and its text."
- repetition · run 2 · pass · default: Each row states its status only once, in its tag, honouring "Say a thing once: a card doesn't repeat "Overdue" in its title, its tag and its text."
- repetition · run 3 · pass · default: Each row states its status only once, in its tag, in line with "Say a thing once: a card doesn't repeat "Overdue" in its title, its tag and its text."
