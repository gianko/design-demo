# Stack: gaps

Each entry is one place where the brief, the ADRs or the tokens didn't decide something Stack needed. It gives the call made and the alternative a human might prefer.

## Stack's default gap is a guess

**Undecided:** the spec gives Stack a "token-union gap", but nothing says what a Stack with no `gap` gets, or whether `gap` should be required at all. A UI spec that leaves it out still renders, so the default shapes every generated screen where the model omits the prop.

**Call:** `gap` is optional and defaults to `sm` (16px), the middle step of the scale. It is wide enough to separate two paragraphs and tight enough to read as one group at either density.

**Alternative:** make `gap` required, so the spec step makes every spacing call explicitly. Or default it by direction, for example `sm` for a column and `xs` for a row.

## Stack gaps don't follow density

**Undecided:** ADR 0001 lists what density changes (row heights, container padding, body size, icon size, surface radius, target size), and spacing between nodes isn't on the list. So a contractor screen gets 36px page padding and 16px body text, but exactly the same Stack gaps as the admin. The brief's "Contractor screens have room" could be read as covering gaps too.

**Call:** gaps are the fixed spacing steps at both densities. The spec step can pick a wider step on contractor screens if it wants more room.

**Alternative:** density-aware gap tokens (for example `density.gap.group` and `density.gap.section`, tighter for admin), offered as extra `gap` options or in place of some fixed steps.

## Stack rows always wrap, with no breakpoints

**Undecided:** the brief says the contractor is "often on a phone", but neither the brief nor the ADRs give the UI spec any responsive vocabulary. A row of a long client name, an invoice number and a due date overflows a 360px screen unless something reflows it.

**Call:** `direction: row` always sets `flex-wrap`, so children that run out of room move onto the next line. There is no prop to turn this off and no breakpoint props.

**Alternative:** a `wrap` boolean prop, defaulting to true, for a row that must stay on one line and truncate instead. Or a `direction: responsive` option that is a column on narrow screens and a row from some width up, which would need a breakpoint token the brief doesn't have.

## Stack can't centre on the main axis or end-align on the cross axis

**Undecided:** the spec asks for "alignment" without naming the options. Every option is a choice a generated screen can get wrong, and the brief doesn't say which layouts it expects.

**Call:** `align` offers `stretch`, `start`, `center` and `baseline`. `justify` offers `start`, `between` and `end`. There is no `justify: center`: a centred column is the template hero the brief bans, and Stripe-like work surfaces are left-aligned. There is no `align: end`: right-aligned money belongs to tables and Amount, and the screenshot critique cut it as the one accessory. An empty state therefore can't be centred on the page.

**Alternative:** add `justify: center` if the human wants empty states or confirmation moments centred. Add `align: end` if a right-aligned column of amounts outside DataTable turns out to be needed.

## `justify: between` spreads a row across the full width of a wide screen

**Undecided:** nothing sets a content width (Screen's and Text's gaps already note there is no measure token). A `between` row placed directly in a Screen at 1280px puts its label and value more than 1,000px apart (see the Between and Nested stories). That is hard to scan, and it is unlike Stripe's compact label–value pairs.

**Call:** Stack sets no maximum width. A `between` row is meant to sit inside a Card or another bounded container, which gives it a reasonable span.

**Alternative:** a content-width token applied by Screen or Card, which would bound every `between` row. Or a `use` line that tells the spec step to put `between` rows only inside a Card.

## Stack has no semantic element

**Undecided:** Stack renders a plain `<div>`. Some groups are really lists, such as three payment cards or a run of reminders, and a screen reader would announce them as a list with a count only if they were `<ul>`/`<li>`. Generated screens have no intrinsic elements (ADR 0004), so they can't add that markup themselves.

**Call:** always a `<div>`, with no role. This matches the default, and the brief doesn't mention list semantics.

**Alternative:** an `as: list` option that renders `<ul>` and wraps each child in an `<li>`. Or leave list semantics to DataTable and a future List component.
