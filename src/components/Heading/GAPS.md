# Heading: gaps

Each entry is one place the brief, ADRs or tokens didn't decide something Heading needed, the call made, and the alternative a human might prefer.

## Heading level 3 borrows the label type role

**Undecided:** the brief's scale is 12, 14, 16, 20, 24, 32, and the type tokens name `title` (24), `heading` (20) and `figure` (32) at 600. Heading needs three levels, so one level has to sit below 20px, and no role is named for a small heading. The only 600 role below 20px is `label`, which Text's plan reserves for "control and field labels".

**Call:** level 1 is `text-title`, level 2 `text-heading`, and level 3 `text-label` (14px admin, 16px contractor, 600). So level 3 follows density as body text does, and it looks the same as a field label.

**Alternative:** a `subheading` type role (for example a fixed 16px at 600, or a density token like `label`) so that level 3 and labels can change separately. Or level 3 could be `heading` at 20px, which would leave levels 2 and 3 looking the same.

## Nothing balances a wrapped heading

**Undecided:** RULES.md skips impeccable's `unbalanced-heading` because "`text-wrap: balance` in base CSS once". No base CSS sets it: `src/styles.css` and the Storybook preview don't, and build sessions can't edit either. On a contractor's phone, a long title such as "Invoice INV-0142 for Northwind Logistics & Freight Holdings Ltd." can leave one word alone on its last line.

**Call:** Heading sets no `text-balance`. The first version had it, and the screenshot critique cut it as the one accessory, because RULES.md puts it in base CSS and not in each component. Headings wrap as plain text.

**Alternative:** add `h1, h2, h3 { text-wrap: balance }` (and `p { text-wrap: pretty }` for Text) to the library's base CSS, as RULES.md assumes. Or put `text-balance` back on Heading's root.

## Heading takes its copy through `text`, as Text does

**Undecided:** Text's gaps note that ADR 0004 doesn't name the prop a typography component takes its copy through, and that "Heading will need the same call, and both should agree".

**Call:** a required `text: string` prop, with no children and no slots, which matches Text.

**Alternative:** `children: z.string()` for both, if the human resolves Text's gap the other way. Both components should change together.
