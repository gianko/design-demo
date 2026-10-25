# Heading: gaps

Each entry is one place the brief, ADRs or tokens didn't decide something Heading needed, the call made, and the alternative a human might prefer.

## Heading level 3 borrows the label type role

**Undecided:** the brief's scale is 12, 14, 16, 20, 24, 32, and the type tokens name `title` (24), `heading` (20) and `figure` (32) at 600. Heading needs three levels, so one level has to sit below 20px, and no role is named for a small heading. The only 600 role below 20px is `label`, which Text's plan reserves for "control and field labels".

**Call:** level 1 is `text-title`, level 2 `text-heading`, and level 3 `text-label` (14px admin, 16px contractor, 600). So level 3 follows density as body text does, and it looks the same as a field label.

**Alternative:** a `subheading` type role (for example a fixed 16px at 600, or a density token like `label`) so that level 3 and labels can change separately. Or level 3 could be `heading` at 20px, which would leave levels 2 and 3 looking the same.

## Heading takes its copy through `text`, as Text does

**Undecided:** Text's gaps note that ADR 0004 doesn't name the prop a typography component takes its copy through, and that "Heading will need the same call, and both should agree".

**Call:** a required `text: string` prop, with no children and no slots, which matches Text.

**Alternative:** `children: z.string()` for both, if the human resolves Text's gap the other way. Both components should change together.
