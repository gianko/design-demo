# Brief conformance calibration

Written by `pnpm eval:calibrate` (ADR 0014) on 2026-10-29, at `a912fad`. The judge is claude-opus-5-5 at effort high, prompt `203699f2f104`. The calibration set's 8 screens, 3 kept screens as they are and 5 broken copies, have 33 screen states, and each was judged 3 times. It cost $2.72.

## Right verdicts and flips

A screen's verdict on a criterion in one run fails when any of its states fails it. It's right when a kept screen passes, and when a broken copy fails the criterion it breaks and passes the rest. A screen's criterion flipped when its verdicts differ between runs.

| Criterion | Right | Flipped |
| --- | --- | --- |
| hierarchy | 19/19 (100%) | 0/8 (0%) |
| density | 20/20 (100%) | 0/8 (0%) |
| accent | 15/20 (75%) | 1/8 (13%) |
| elevation | 19/19 (100%) | 0/8 (0%) |
| copy | 20/20 (100%) | 0/8 (0%) |
| repetition | 19/19 (100%) | 0/8 (0%) |
| **All** | 112/117 (96%) | 1/48 (2%) |

27 verdicts not run, and left out of both: the judge didn't answer for a state, and no other state failed the criterion.

## bulk-pay

Kept, as it is.

States: default · empty · payment-scheduled · payment-failed · default, rows ticked.

| Criterion | Expected | Run 1 | Run 2 | Run 3 |
| --- | --- | --- | --- | --- |
| hierarchy | pass | pass | not run | pass |
| density | pass | pass | not run | pass |
| accent | pass | pass | not run | pass |
| elevation | pass | pass | not run | pass |
| copy | pass | pass | not run | pass |
| repetition | pass | pass | not run | pass |

- hierarchy · run 1 · pass · default: The bold "Pay invoices" title clearly outranks the table, with weight-set headers below, consistent with "hierarchy comes from size and weight, not from a second face."
- hierarchy · run 2 · not run · payment-scheduled: malformed: copy quotes nothing in the design brief
- hierarchy · run 3 · pass · default: The single 600-weight title "Pay invoices" sits clearly above the table, whose headers are set apart by weight and colour rather than size, matching "hierarchy comes from size and weight, not from a second face."
- density · run 1 · pass · default: Rows measure about 46px with compact 14px text and tight padding, matching "Admin screens are dense."
- density · run 2 · not run · payment-scheduled: malformed: copy quotes nothing in the design brief
- density · run 3 · pass · default: Rows sit at roughly 46px with 14px text and about 28px page padding, in line with "**Admin screens are dense.**"
- accent · run 1 · pass · default: No heather appears anywhere: the disabled "Pay selected" button is a flat neutral and the checkboxes are unticked, so nothing breaks "a dusty berry for primary actions, selection and focus only".
- accent · run 2 · not run · payment-scheduled: malformed: copy quotes nothing in the design brief
- accent · run 3 · pass · default: No heather appears anywhere: the Pay selected button is shown in its flat disabled neutral and the status tags use amber, consistent with "a dusty berry for primary actions, selection and focus only."
- elevation · run 1 · pass · default: The table frame sits flat on the page with only a hairline border and no shadow, as in "flat (page and cards, separated by a `line` hairline)".
- elevation · run 2 · not run · payment-scheduled: malformed: copy quotes nothing in the design brief
- elevation · run 3 · pass · default: The table frame is separated from the page by a hairline with no visible shadow, matching "flat (page and cards, separated by a `line` hairline)".
- copy · run 1 · pass · default: The footer says "No invoices selected" and the button says "Pay selected", both plain and specific, and there is no error to test "Errors say what happened and what to do next."
- copy · run 2 · not run · payment-scheduled: malformed: copy quotes nothing in the design brief
- copy · run 3 · pass · default: The footer reads "No invoices selected" and the action reads "Pay selected", both plain and specific, and there is no error to judge, so it meets "**Copy** is second person, active and specific".
- repetition · run 1 · pass · default: Each row states its status once in an "Awaiting" tag, the title and button do not echo each other, and there are no "Unnecessary typographic labels above content."
- repetition · run 2 · not run · payment-scheduled: malformed: copy quotes nothing in the design brief
- repetition · run 3 · pass · default: Each row states its status once, as an "Awaiting" tag, and no title or text echoes it, so nothing breaks "one `loop` (1280ms) per pass, linear, so it never jumps" or duplicates content.

## my-invoices

Kept, as it is.

States: default · empty · default, sheet open.

| Criterion | Expected | Run 1 | Run 2 | Run 3 |
| --- | --- | --- | --- | --- |
| hierarchy | pass | not run | pass | pass |
| density | pass | not run | pass | pass |
| accent | pass | fail | fail | fail |
| elevation | pass | not run | pass | pass |
| copy | pass | not run | pass | pass |
| repetition | pass | not run | pass | pass |

- hierarchy · run 1 · not run · default: malformed: copy quotes nothing in the design brief
- hierarchy · run 2 · pass · default: The single "My invoices" heading is the largest, heaviest text and sits above a table whose headers are body-size and muted, matching "Titles (24px and up) and a single large figure use 600" and "hierarchy comes from size and weight, not from a second face."
- hierarchy · run 3 · pass · default: A single semibold "My invoices" title sits above the table, and the headers are set apart by weight and muted colour rather than size, matching "hierarchy comes from size and weight, not from a second face."
- density · run 1 · not run · default: malformed: copy quotes nothing in the design brief
- density · run 2 · pass · default: The contractor table has roomy rows of about 60px, a 36px page inset and body-size text, fitting "Contractor screens have room."
- density · run 3 · pass · default: Rows look about 60px tall and the page padding about 36px, with comfortable body text, which fits "Contractor screens have room."
- accent · run 1 · fail · default, sheet open: Both rows' invoice numbers are tinted in a berry accent hue even though neither row is selected and neither is a primary action, which breaks "a dusty berry for primary actions, selection and focus only."
- accent · run 2 · fail · default, sheet open: Both invoice numbers in the table, INV-0142 and INV-0151, are tinted in a coloured, accent-like hue even though the table isn't selectable and has no actions, breaking "a dusty berry for primary actions, selection and focus only."
- accent · run 3 · fail · default, sheet open: The invoice numbers in both table rows are set in the heather accent even though nothing is selected or focused, which breaks "a dusty berry for primary actions, selection and focus only."
- elevation · run 1 · not run · default: malformed: copy quotes nothing in the design brief
- elevation · run 2 · pass · default: The table frame is separated from the page by a hairline border with no shadow, as in "flat (page and cards, separated by a `line` hairline)", so no shadow is used just to make a box.
- elevation · run 3 · pass · default: The table frame is separated from the page by a hairline border with no shadow, consistent with "flat (page and cards, separated by a `line` hairline)".
- copy · run 1 · not run · default: malformed: copy quotes nothing in the design brief
- copy · run 2 · pass · default: The visible copy is the brief-given title plus plain column headers and status words, with nothing generic or exclamatory, in line with "Copy is second person, active and specific"; there is no error to judge.
- copy · run 3 · pass · default: The only copy is the brief-given title "My invoices" and plain sentence-case headers with specific dates like "Oct 8", and no error is shown, consistent with "Copy is second person, active and specific".
- repetition · run 1 · not run · default: malformed: copy quotes nothing in the design brief
- repetition · run 2 · pass · default: Each row states its status once, in its tag ("Overdue", "Scheduled"), and no other cell repeats it, consistent with "Every status tag carries its word."
- repetition · run 3 · pass · default: Each row states its status once, in its tag ("Overdue", "Scheduled"), with no duplicate wording in other cells, so nothing repeats; this keeps "Every status tag carries its word" without echoing it elsewhere.

## payment-status

Kept, as it is.

States: default · empty · reminder-sent · reminder-failed.

| Criterion | Expected | Run 1 | Run 2 | Run 3 |
| --- | --- | --- | --- | --- |
| hierarchy | pass | not run | pass | pass |
| density | pass | not run | pass | pass |
| accent | pass | not run | pass | pass |
| elevation | pass | not run | pass | pass |
| copy | pass | not run | pass | pass |
| repetition | pass | not run | pass | pass |

- hierarchy · run 1 · not run · reminder-sent: malformed: accent quotes nothing in the design brief
- hierarchy · run 2 · pass · default: "Payment status" is the one title, set larger and heavier than the card content, and the amount stands out as the one large figure the brief allows: "Titles (24px and up) and a single large figure use 600".
- hierarchy · run 3 · pass · default: The 600-weight "Payment status" title leads, then the card, where the amount is the one large figure; this follows "Titles (24px and up) and a single large figure use 600 with slightly tightened tracking" and "hierarchy comes from size and weight, not from a second face."
- density · run 1 · not run · reminder-sent: malformed: accent quotes nothing in the design brief
- density · run 2 · pass · default: The contractor view has generous page padding, a tall full-width button and airy spacing between lines, which matches "Contractor screens have room."
- density · run 3 · pass · default: The screen gives the contractor room: about 36px page padding, a 44px-tall full-width button and roughly 16px body text match "Contractor screens have room."
- accent · run 1 · not run · reminder-sent: malformed: accent quotes nothing in the design brief
- accent · run 2 · pass · default: Heather fills only the "Send reminder" primary button; the Overdue tag uses its own red and nothing else is tinted, which keeps to "a dusty berry for primary actions, selection and focus only."
- accent · run 3 · pass · default: Heather appears only on the filled "Send reminder" button, and the status tag uses red, which keeps to "a dusty berry for primary actions, selection and focus only."
- elevation · run 1 · not run · reminder-sent: malformed: accent quotes nothing in the design brief
- elevation · run 2 · pass · default: The card sits flat with a hairline border and no shadow, which follows "flat (page and cards, separated by a `line` hairline)".
- elevation · run 3 · pass · default: The card sits flat on the page with a hairline edge and no shadow, as in "flat (page and cards, separated by a `line` hairline)".
- copy · run 1 · not run · reminder-sent: malformed: accent quotes nothing in the design brief
- copy · run 2 · pass · default: The visible copy ("Send reminder", "Due Oct 8") is specific and active, and this state shows no error, in line with "Copy is second person, active and specific".
- copy · run 3 · pass · default: The visible copy ("Send reminder", "Due Oct 8") is active and specific, and there is no error to judge, in line with "Copy is second person, active and specific".
- repetition · run 1 · not run · reminder-sent: malformed: accent quotes nothing in the design brief
- repetition · run 2 · pass · default: "Overdue" appears only once, in the status tag; the card is titled with the invoice number and the body gives only the due date, so it avoids repeating the status, as the brief asks with "Every status tag carries its word."
- repetition · run 3 · pass · default: "Overdue" appears only in the status tag. The title shows the invoice number and the text shows the due date and client, so nothing repeats, consistent with "Every status tag carries its word."

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

- hierarchy · run 1 · pass · default: "Payment status" is the one semibold title and the content reads below it, with "$4,800.00" as the permitted "single large figure", so "hierarchy comes from size and weight, not from a second face."
- hierarchy · run 2 · pass · default: "Payment status" is the single semibold title, and the only larger element is the amount, which the brief allows as "a single large figure" in 600, so "hierarchy comes from size and weight, not from a second face" holds.
- hierarchy · run 3 · pass · default: The 24px semibold "Payment status" title leads, followed by the card with one large $4,800.00 figure and smaller supporting lines, matching "Titles (24px and up) and a single large figure use 600".
- density · run 1 · pass · default: The page padding, 16px body text and roughly 44px-tall buttons give the contractor screen room, matching "Contractor screens have room."
- density · run 2 · pass · default: The contractor view has roomy page padding, 16px body text and roughly 44px-tall buttons, matching "Contractor screens have room."
- density · run 3 · pass · default: The contractor screen has roomy padding, 16px body text and controls about 44px tall, as in "Contractor screens have room."
- accent · run 1 · fail · default: Both "Send reminder" and "Download invoice" are filled heather buttons, so the accent sits on a secondary action as well as the primary one, breaking "a dusty berry for primary actions, selection and focus only."
- accent · run 1 · fail · reminder-failed: Both "Send reminder" and the secondary "Download invoice" are filled heather, so the accent is no longer reserved for "primary actions, selection and focus only."
- accent · run 2 · fail · default: Both "Send reminder" and the secondary "Download invoice" are filled heather, so the accent marks two actions instead of one, breaking "a dusty berry for primary actions, selection and focus only" and its rationale "one accent keeps "what can I do here" obvious."
- accent · run 2 · fail · reminder-failed: Both "Send reminder" and the secondary "Download invoice" are filled with heather, so the accent spreads past the single primary action, against "a dusty berry for primary actions, selection and focus only".
- accent · run 3 · fail · default: Both "Send reminder" and "Download invoice" are filled heather buttons, so the accent sits on a secondary action as well as the primary, breaking "a dusty berry for primary actions, selection and focus only."
- accent · run 3 · fail · reminder-failed: Both "Send reminder" and "Download invoice" are filled in the heather accent, so a secondary action takes the colour reserved by "a dusty berry for primary actions, selection and focus only."
- elevation · run 1 · pass · default: The card sits flat with a hairline border and no shadow, consistent with "flat (page and cards, separated by a `line` hairline)".
- elevation · run 2 · pass · default: The card sits flat, set off by a hairline border with no visible shadow, consistent with "flat (page and cards, separated by a `line` hairline)".
- elevation · run 3 · pass · default: The card sits flat on the page with a hairline border and no shadow, consistent with "flat (page and cards, separated by a `line` hairline)".
- copy · run 1 · pass · default: The visible copy is plain and specific ("Due Oct 8", "Send reminder"), and there is no error to judge, in line with "Copy is second person, active and specific".
- copy · run 2 · pass · default: The visible copy, "Send reminder", "Due Oct 8" and "Download invoice", is plain and specific, and no error is shown, so it fits "Copy is second person, active and specific".
- copy · run 3 · pass · default: The visible copy ("Due Oct 8", "Send reminder") is plain and specific, with no vague or exclamatory wording and no error shown, in line with "Copy is second person, active and specific".
- repetition · run 1 · pass · default: "Overdue" appears only in the status tag, and the title, amount, due date and client each say something different, honouring "Every status tag carries its word" without echoing it elsewhere.
- repetition · run 2 · pass · default: "Overdue" appears only once, in the status tag, and the title, amount, due date and client each say something different, so nothing repeats, consistent with "Every status tag carries its word."
- repetition · run 3 · pass · default: "Overdue" appears only once, in the status tag, while the title shows the invoice number and the text shows the due date, so nothing echoes, honouring "Every status tag carries its word."

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

- hierarchy · run 1 · pass · default: The page has one clear title, "Payment status", in 600 weight, followed by the card content and a single large figure for the amount, matching "hierarchy comes from size and weight, not from a second face".
- hierarchy · run 2 · pass · default: "Payment status" is the one semibold title, and the $4,800.00 amount is the permitted "single large figure" above lighter body lines, following "hierarchy comes from size and weight, not from a second face."
- hierarchy · run 3 · pass · default: The 600-weight "Payment status" title leads, followed by the card, where the amount is the one figure the brief allows to be large: "Titles (24px and up) and a single large figure use 600 with slightly tightened tracking".
- density · run 1 · pass · default: The contractor view has generous spacing: roughly 36px page padding, a 44px-tall full-width button and 16px body text, fitting "Contractor screens have room."
- density · run 2 · pass · default: The page padding is about 36px, the button is about 44px tall and the text runs near 16px, matching "Contractor screens have room."
- density · run 3 · pass · default: For the contractor, the page has about 36px of padding, 16px body text and a 44px full-width button, which matches "Contractor screens have room."
- accent · run 1 · pass · default: Heather appears only on the primary "Send reminder" button, and the Overdue tag uses its own red, in line with "a dusty berry for primary actions, selection and focus only."
- accent · run 2 · pass · default: Heather fills only the Send reminder button, while the Overdue tag uses red status colour, consistent with "a dusty berry for primary actions, selection and focus only."
- accent · run 3 · pass · default: Heather appears only on the primary "Send reminder" button; the status tag uses red, in line with "a dusty berry for primary actions, selection and focus only."
- elevation · run 1 · fail · default: The in-page invoice card carries a soft drop shadow, though it doesn't float, which breaks "A shadow means "this floats", never "this is a box"." and "flat (page and cards, separated by a `line` hairline)".
- elevation · run 1 · fail · reminder-sent: The static invoice card carries a soft drop shadow under its hairline border even though it doesn't float, which breaks "A shadow means "this floats", never "this is a box"."
- elevation · run 1 · fail · reminder-failed: The invoice card has a hairline border plus a soft drop shadow along its bottom edge, so it is a card that doesn't float yet carries a shadow, against "flat (page and cards, separated by a `line` hairline)".
- elevation · run 2 · fail · default: The static invoice card carries a soft drop shadow on top of its hairline border, though cards should be flat and "A shadow means "this floats", never "this is a box"."
- elevation · run 2 · fail · reminder-sent: The card is a static content box with both a hairline border and a soft drop shadow, but the brief puts cards at flat ("flat (page and cards, separated by a `line` hairline)") and says "A shadow means "this floats", never "this is a box"."
- elevation · run 2 · fail · reminder-failed: The static invoice card has a soft drop shadow under its bottom edge on top of its hairline border, though cards should be "flat (page and cards, separated by a `line` hairline)" and "A shadow means "this floats", never "this is a box"."
- elevation · run 3 · fail · default: The static invoice card has both a hairline border and a soft drop shadow, though it doesn't float, which breaks "A shadow means "this floats", never "this is a box"."
- elevation · run 3 · fail · reminder-sent: The invoice card sits on the page with both a hairline border and a soft drop shadow, though cards should be "flat (page and cards, separated by a `line` hairline)" and "A shadow means "this floats", never "this is a box"."
- elevation · run 3 · fail · reminder-failed: The static invoice card carries a soft drop shadow beneath its hairline border even though cards should be flat, which breaks "A shadow means "this floats", never "this is a box"."
- copy · run 1 · pass · default: The copy is specific and active, with "Send reminder" and "Due Oct 8" and no vague timing; this state shows no error, so it meets "Copy is second person, active and specific".
- copy · run 2 · pass · default: The visible copy ("Send reminder", "Due Oct 8") is active and specific with no vague dates or exclamations, and no error is shown, in line with "Copy is second person, active and specific".
- copy · run 3 · pass · default: The visible copy is specific and actionable ("Send reminder", "Due Oct 8") with no vague timing, and there is no error on screen, consistent with "Copy is second person, active and specific".
- repetition · run 1 · pass · default: "Overdue" appears only in the status tag, while the title holds the invoice number and the text gives the due date and client, satisfying "Every status tag carries its word" without echoing it elsewhere.
- repetition · run 2 · pass · default: "Overdue" appears only in the status tag, and the title, amount, due date and client each say something different, so nothing repeats; the tag alone meets "Every status tag carries its word."
- repetition · run 3 · pass · default: "Overdue" appears only in the status tag, and the title, number, date and client each say something different, so the screen honours "Every status tag carries its word" without repeating it elsewhere.

## bulk-pay--copy

Breaks copy: The title says Streamline your payroll, not Pay invoices.

States: default · empty · payment-scheduled · payment-failed · default, rows ticked.

| Criterion | Expected | Run 1 | Run 2 | Run 3 |
| --- | --- | --- | --- | --- |
| hierarchy | pass | not run | pass | pass |
| density | pass | not run | pass | pass |
| accent | pass | not run | pass | pass |
| elevation | pass | not run | pass | pass |
| copy | fail | fail | fail | fail |
| repetition | pass | not run | pass | pass |

- hierarchy · run 1 · not run · empty: malformed: elevation, copy quote nothing in the design brief
- hierarchy · run 2 · pass · default: A single 24px semibold title sits above the table, whose headers use weight and muted colour rather than size, so the screen follows "hierarchy comes from size and weight, not from a second face".
- hierarchy · run 3 · pass · default: The bold 24px-ish title sits alone above a table whose 600-weight muted headers and regular rows step down cleanly, matching "hierarchy comes from size and weight, not from a second face."
- density · run 1 · not run · empty: malformed: elevation, copy quote nothing in the design brief
- density · run 2 · pass · default: Rows sit at about 46px with 14px body text and tight padding, matching "Admin screens are dense." for this admin screen.
- density · run 3 · pass · default: Rows are about 46px with 14px body text and a compact footer button, fitting "Admin screens are dense."
- accent · run 1 · not run · empty: malformed: elevation, copy quote nothing in the design brief
- accent · run 2 · pass · default: No heather appears anywhere: the Pay selected button is in its disabled neutral and nothing is selected, consistent with "a dusty berry for primary actions, selection and focus only".
- accent · run 3 · pass · default: No heather appears anywhere: checkboxes are neutral and the disabled "Pay selected" button is a flat grey fill, consistent with "a dusty berry for primary actions, selection and focus only."
- elevation · run 1 · not run · empty: malformed: elevation, copy quote nothing in the design brief
- elevation · run 2 · pass · default: The table is a flat surface outlined by a hairline with no shadow, following "flat (page and cards, separated by a `line` hairline)".
- elevation · run 3 · pass · default: The table frame is separated from the page by a hairline with no shadow, matching "flat (page and cards, separated by a `line` hairline)".
- copy · run 1 · fail · default: The title "Streamline your payroll" is vague marketing copy rather than a plain label for paying these invoices, so it is not "second person, active and specific" and misses the brief's "Pay invoices".
- copy · run 1 · fail · payment-scheduled: The page title reads "Streamline your payroll", a vague marketing slogan instead of a specific statement of the task (the brief asks for "Pay invoices"), which breaks "is second person, active and specific".
- copy · run 1 · fail · payment-failed: The failure toast is good, but the page title "Streamline your payroll" is vague marketing copy rather than the task the screen does, breaking "Copy is second person, active and specific" and departing from the brief's "Pay invoices".
- copy · run 1 · fail · default, rows ticked: The title reads "Streamline your payroll", a vague marketing line rather than the screen brief's "Pay invoices", which breaks "Copy is second person, active and specific".
- copy · run 2 · fail · default: The title reads "Streamline your payroll", a vague marketing slogan in place of the screen brief's "Pay invoices", which breaks "second person, active and specific".
- copy · run 2 · fail · empty: The title reads "Streamline your payroll", a vague marketing line in place of a specific task title, which falls short of copy that "is second person, active and specific"; the empty-state text itself is plain and specific.
- copy · run 2 · fail · payment-scheduled: The page title reads "Streamline your payroll", a vague marketing line where the screen brief asks for "Pay invoices", so it breaks "Copy is second person, active and specific" even though the toast and footer copy are specific.
- copy · run 2 · fail · payment-failed: The failure toast says what happened and what to do next, but the page title "Streamline your payroll" is vague marketing copy rather than a specific title for this task, which breaks "**Copy** is second person, active and specific".
- copy · run 2 · fail · default, rows ticked: The title reads "Streamline your payroll", a vague marketing slogan in place of the screen brief's "Pay invoices", which breaks "Copy is second person, active and specific".
- copy · run 3 · fail · default: The page title reads as the marketing slogan "Streamline your payroll" instead of naming the task, which breaks "Copy is second person, active and specific".
- copy · run 3 · fail · empty: The page title reads as a vague marketing slogan, "Streamline your payroll", instead of naming the task (the screen brief asks for "Pay invoices"), so it breaks the brief's rule that copy "is second person, active and specific", although the empty-state text itself is plain.
- copy · run 3 · fail · payment-scheduled: The page title reads "Streamline your payroll", a vague marketing tagline rather than the screen's task named in the screen brief ("Pay invoices"), which breaks "Copy is second person, active and specific".
- copy · run 3 · fail · payment-failed: The toast says what happened and what to do next, but the title "Streamline your payroll" is vague marketing copy in place of the brief's "Pay invoices", which breaks "Copy is second person, active and specific".
- copy · run 3 · fail · default, rows ticked: The title reads "Streamline your payroll", a vague marketing line instead of the specific "Pay invoices" the screen brief asks for, which breaks "Copy is second person, active and specific".
- repetition · run 1 · not run · empty: malformed: elevation, copy quote nothing in the design brief
- repetition · run 2 · pass · default: Each row states its status once, in the Awaiting tag, with no echo in other cells, as in "Every status tag carries its word."
- repetition · run 3 · pass · default: Each row states its status once in an "Awaiting" tag, and neither the title nor the footer repeats it, so the brief's "Every status tag carries its word" is met without redundancy.

## bulk-pay--density

Breaks density: The admin screen's Screen sets the contractor's density.

States: default · empty · payment-scheduled · payment-failed · default, rows ticked.

| Criterion | Expected | Run 1 | Run 2 | Run 3 |
| --- | --- | --- | --- | --- |
| hierarchy | pass | pass | pass | not run |
| density | fail | fail | fail | fail |
| accent | pass | pass | pass | not run |
| elevation | pass | pass | pass | not run |
| copy | pass | pass | pass | not run |
| repetition | pass | pass | pass | not run |

- hierarchy · run 1 · pass · default: The 600-weight "Pay invoices" title clearly outranks the table, whose headers use weight and muted colour rather than size, matching "hierarchy comes from size and weight, not from a second face."
- hierarchy · run 2 · pass · default: "Pay invoices" sits alone at the top as the one larger, heavier title, and the table follows with weight-set headers, matching "hierarchy comes from size and weight, not from a second face."
- hierarchy · run 3 · not run · payment-scheduled: malformed: copy quotes nothing in the design brief
- density · run 1 · fail · default: This admin screen has roughly 60px rows, about 36px page padding, around 16px body text and a roughly 44px button, which are the contractor values, not the dense ones the brief demands in "Admin screens are dense."
- density · run 1 · fail · empty: For an admin screen, the content sits about 36px from the edge and the body text reads near 16px, which matches the contractor's "Page padding | 28px | 36px" and "Body text | 14px | 16px" rather than "Admin screens are dense."
- density · run 1 · fail · payment-scheduled: On this admin screen the header and body rows measure about 60px tall and the page padding is about 36px, which is the contractor's spacing rather than the admin's "Row height | 46px | 60px" and "Page padding | 28px | 36px", so the brief's "Admin screens are dense." is broken.
- density · run 1 · fail · payment-failed: Rows run about 60px, the body text looks like 16px and the Pay selected button is about 44px tall, which is the contractor's full room rather than "Admin screens are dense." with its 46px rows and 32px controls.
- density · run 1 · fail · default, rows ticked: The table uses contractor-scale sizing on an admin screen: rows about 60px tall, a Pay selected button about 44px high and roughly 36px page padding, where the brief says "Admin screens are dense." with a "Row height | 46px | 60px" split.
- density · run 2 · fail · default: On an admin screen the rows measure about 60px, the text looks closer to 16px and the page padding is about 36px, which is the contractor's full room, not the admin's "Row height | 46px | 60px" working density.
- density · run 2 · fail · empty: On this admin screen the content sits about 36px from the page edge, the body line reads at roughly 16px and the card corners look about 12px, which matches the contractor's "Page padding | 28px | 36px" and "Body text | 14px | 16px" rather than the brief's "Admin screens are dense."
- density · run 2 · fail · payment-scheduled: This admin screen has rows about 60px tall, body text near 16px and 36px page padding, which is the contractor's room rather than the brief's "Admin screens are dense."
- density · run 2 · fail · payment-failed: On this admin screen, rows and the header measure about 60px, controls about 44px and page padding about 36px, which matches the contractor's "Contractor: full room" sizing rather than the admin's 46px rows and 32px controls; "Admin screens are dense." is not met.
- density · run 2 · fail · default, rows ticked: On this admin screen the rows measure about 60px, the Pay selected button is about 44px tall and the page padding is about 36px, which is the contractor's "Row height | 46px | 60px" spacing rather than the admin's, breaking "Admin screens are dense."
- density · run 3 · fail · default: Rows and the header measure about 60px, the text looks around 16px and the page padding is about 36px, so this admin screen uses contractor spacing instead of the brief's "Admin screens are dense."
- density · run 3 · fail · empty: This is an admin screen, yet the roughly 36px page inset, the roughly 16px body line and the softer, larger card corner match the contractor column rather than the admin's "Page padding | 28px | 36px" and "Body text | 14px | 16px", so it doesn't read as "Admin screens are dense."
- density · run 3 · fail · payment-failed: On this admin screen the header and body rows measure about 60px, with roughly 16px text and 36px page padding, which is the contractor's full room rather than the working density the brief requires: "Admin screens are dense."
- density · run 3 · fail · default, rows ticked: On this admin screen, rows and the header are about 60px tall, the page padding is about 36px and the Pay selected button is about 44px high, which is contractor sizing rather than the admin's "Row height | 46px | 60px" and "Page padding | 28px | 36px".
- accent · run 1 · pass · default: No heather appears anywhere: the disabled "Pay selected" button uses a flat neutral fill and the checkboxes are neutral, consistent with "a dusty berry for primary actions, selection and focus only."
- accent · run 2 · pass · default: No heather shows anywhere: the checkboxes are neutral, the disabled "Pay selected" button is a flat neutral, and the tags use status amber, consistent with "a dusty berry for primary actions, selection and focus only."
- accent · run 3 · not run · payment-scheduled: malformed: copy quotes nothing in the design brief
- elevation · run 1 · pass · default: The table card sits flat on the page, separated by a hairline with no visible shadow, in line with "flat (page and cards, separated by a `line` hairline)".
- elevation · run 2 · pass · default: The table card is flat and set apart by a hairline border with no shadow, as in "flat (page and cards, separated by a `line` hairline)".
- elevation · run 3 · not run · payment-scheduled: malformed: copy quotes nothing in the design brief
- copy · run 1 · pass · default: The visible copy ("Pay selected", "No invoices selected") is plain and specific with no exclamation marks, and there is no error to judge, meeting "Copy is second person, active and specific".
- copy · run 2 · pass · default: The footer reads "No invoices selected" and the action reads "Pay selected", both plain and specific, and the screen shows no error, in line with "Admin copy is terser; the warmth stays."
- copy · run 3 · not run · payment-scheduled: malformed: copy quotes nothing in the design brief
- repetition · run 1 · pass · default: Each row states its status once, in its tag, and the title and footer don't echo each other, so nothing breaks "Copy is second person, active and specific" through redundant repeats.
- repetition · run 2 · pass · default: Each row states its status once, in a single "Awaiting" tag, and the footer states the selection count once, so nothing echoes itself, in line with "Every status tag carries its word."
- repetition · run 3 · not run · payment-scheduled: malformed: copy quotes nothing in the design brief

## my-invoices--hierarchy

Breaks hierarchy: The title is muted body Text, not a level-1 Heading.

States: default · empty · default, sheet open.

| Criterion | Expected | Run 1 | Run 2 | Run 3 |
| --- | --- | --- | --- | --- |
| hierarchy | fail | fail | fail | fail |
| density | pass | pass | pass | pass |
| accent | pass | fail | fail | pass |
| elevation | pass | pass | pass | pass |
| copy | pass | pass | pass | pass |
| repetition | pass | pass | pass | pass |

- hierarchy · run 1 · fail · default: The "My invoices" title renders small, light and muted, no larger or heavier than the table headers, so nothing reads as the title, against "Titles (24px and up) and a single large figure use 600 with slightly tightened tracking".
- hierarchy · run 1 · fail · empty: The Heading "My invoices" renders small, regular-weight and muted grey, so the bold, dark "No invoices yet" outranks it, against "Titles (24px and up) and a single large figure use 600 with slightly tightened tracking".
- hierarchy · run 1 · fail · default, sheet open: The page title "My invoices" renders as small, regular-weight muted text no bigger than the table headers, so it is not a clear title, even though the brief says "Titles (24px and up) and a single large figure use 600" and "hierarchy comes from size and weight".
- hierarchy · run 2 · fail · default: The title "My invoices" renders small, regular-weight and in muted ink, no larger or bolder than the table headers, which breaks "Titles (24px and up) and a single large figure use 600 with slightly tightened tracking" and leaves no clear title above the content.
- hierarchy · run 2 · fail · empty: The "My invoices" title renders small, regular-weight and muted, so it reads below the bold, darker "No invoices yet" card heading, which breaks "Titles (24px and up) and a single large figure use 600 with slightly tightened tracking (about −0.015em, −0.02em for the figure)."
- hierarchy · run 2 · fail · default, sheet open: The screen's own title "My invoices" is small, regular weight and muted, so it reads like a breadcrumb rather than the 24px 600 heading the brief asks for in "Titles (24px and up) and a single large figure use 600"; the screen has no clear title.
- hierarchy · run 3 · fail · default: The "My invoices" title renders as small, muted, regular-weight text no larger than the table headers, so it breaks "Titles (24px and up) and a single large figure use 600 with slightly tightened tracking" and the page has no clear title.
- hierarchy · run 3 · fail · empty: The screen title "My invoices" renders small, regular weight and muted, smaller and lighter than the bold empty-state line "No invoices yet", so it breaks "Titles (24px and up) and a single large figure use 600 with slightly tightened tracking".
- hierarchy · run 3 · fail · default, sheet open: The screen's title "My invoices" renders small and muted, about the same size and weight as the table headers, so the page breaks "hierarchy comes from size and weight"; only the sheet has a clear 600 title and figure.
- density · run 1 · pass · default: Rows are about 60px tall with roughly 16px body text and about 36px page padding, matching "Contractor screens have room."
- density · run 2 · pass · default: Rows measure about 60px, body text looks 16px and the page padding is about 36px, matching the contractor's "Contractor screens have room."
- density · run 3 · pass · default: Rows measure about 60px, body text is about 16px and the page padding is generous, which matches "Contractor screens have room."
- accent · run 1 · fail · default, sheet open: Both invoice numbers in the read-only table are tinted in a coloured, accent-like hue that sets them apart from the ink of the other cells, though nothing on them is a primary action or a selection, against "a dusty berry for primary actions, selection and focus only."
- accent · run 2 · fail · default, sheet open: The invoice numbers in both table rows are tinted in the berry accent even though the rows are read-only and neither is selected, which breaks "a dusty berry for primary actions, selection and focus only."
- accent · run 3 · pass · default: No heather appears anywhere on this read-only table; colour is limited to the status tags, consistent with "a dusty berry for primary actions, selection and focus only".
- elevation · run 1 · pass · default: The table frame sits flat on the page with only a hairline edge and no shadow, as in "flat (page and cards, separated by a `line` hairline)".
- elevation · run 2 · pass · default: The table frame is separated by a hairline border with no shadow, consistent with "flat (page and cards, separated by a `line` hairline)".
- elevation · run 3 · pass · default: The table frame uses a hairline border with no shadow, in line with "flat (page and cards, separated by a `line` hairline)".
- copy · run 1 · pass · default: The only copy is the brief's own title and column labels plus specific dates like "Oct 8", with no errors shown, in line with "Copy is second person, active and specific".
- copy · run 2 · pass · default: The only copy is the brief-given title, the column headers and the row data, with no errors to judge against "Errors say what happened and what to do next."
- copy · run 3 · pass · default: The visible copy is limited to plain column headers and data, with no error to judge, so nothing conflicts with "second person, active and specific".
- repetition · run 1 · pass · default: Each row states its status once, in its tag, and nothing else echoes it, so the screen meets "Colour alone never communicates state. Every status tag carries its word." without duplication.
- repetition · run 2 · pass · default: Each row states its status once, in its tag, with no title or text echoing it, so nothing repeats in the way the criterion warns against, and every tag still carries its word as "Every status tag carries its word."
- repetition · run 3 · pass · default: Each row shows its status only once, in its tag ("Every status tag carries its word"), and no title or text restates it.
