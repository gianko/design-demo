# Heading: component plan

## Use

The title of a screen or a section of it: level 1 once per screen for what the screen is about, level 2 for each section under it, level 3 for a group inside a section, never skipping a level. For copy use Text, for a figure Amount, for a status StatusTag.

## Anatomy

One slot, `root`, an `<h1>`, `<h2>` or `<h3>` chosen by `level`, carrying `data-component="Heading"`. Its copy is the `text` prop, a plain string, as Text takes its copy (Text's GAPS.md: "Heading will need the same call, and both should agree"). No children and no slots: nothing nests inside a title. No Radix primitive: Heading isn't interactive.

## Variants, sizes, states

| Variant | Options | Default | Brief line behind it |
|---|---|---|---|
| `level` | the numbers `1`, `2`, `3`, read from the `tv()` keys by `variantNumbers` | none: required | Spec § Component pieces 4: "`level` 1–3". ADR 0004: "heading levels don't skip and there's one level 1", which gate 1 checks, so the spec step has to choose every level; a default would hide the choice. Brief: "hierarchy comes from size and weight, not from a second face", so each level is one step down the scale. |

Each level is a type role from the brief's scale:

- **1 → `title`** (24/32, 600, −0.36px). Brief: "Titles (24px and up) … use 600 with slightly tightened tracking". The 32px step is `figure`, kept for "a single large figure", so no heading takes it.
- **2 → `heading`** (20/28, 600). The next step down: 20 on "12, 14, 16, 20, 24, 32".
- **3 → `label`** (14/20 admin, 16/24 contractor, 600). The step below 20 is body size, so level 3 is body size at 600, the only other weight. It follows density as body text does. See GAPS.md: no role is named for it.

No `tone`: a title is ink. Muted titles would turn into the "unnecessary typographic labels above content" the brief bans, and the accent is "for primary actions, selection and focus only". No size apart from level: size and level move together, so the outline a screen reader hears is the one the eye sees.

States: none. Heading isn't interactive, so rest is its only state; hover, pressed, focus-visible, disabled and pending don't apply.

## Token map

| Slot | Variant | Classes | Why |
|---|---|---|---|
| `root` | always | `text-ink` | "Text is a plum-tinted ink, never `#000`." No `text-balance`: RULES.md (`unbalanced-heading`) puts `text-wrap: balance` "in base CSS once", not in a component, and `src/styles.css` sets it on `h1`–`h3`. Token lint rejects `text-balance` on a component. |
| | `level: 1` | `text-title` | Composite: 24/32, 600, −0.36px. |
| | `level: 2` | `text-heading` | Composite: 20/28, 600. |
| | `level: 3` | `text-label` | Composite: density label, 600. |

No margin: spacing above and below a heading is Stack's (ADR 0002). No font family: the closed theme's default is Instrument Sans.

## A11y contract

- **Role**: `heading`, with `aria-level` from the native `<h1>`–`<h3>`. The visual size follows the level, so they can't disagree.
- **Accessible name**: the copy.
- **Keyboard and focus**: not focusable. Screen readers move by heading without focus.
- **Disabled, busy**: not applicable.
- **Target size**: none; not a target.
- Level order across a screen is gate 1's (no skips, one level 1), not the component's.

## Motion

None. A heading has no user action. One that appears with a screen state change is carried by `useScreenState`'s View Transition (ADR 0011). Reduced motion: nothing to reduce.

## Against defaults

The default version: shadcn's typography `h1` is `scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl`, `h2` adds `border-b pb-2 first:mt-0`; screens pick a heading tag and a size separately, in near-black, with margins and responsive sizes.

How this one differs:

- **Two weights, not extrabold.** All three levels are 600. Brief: "weights 400 and 600 only".
- **24px tops the scale for titles, not 36–48px.** Brief: "Scale … 12, 14, 16, 20, 24, 32. Nothing off the scale", and 32 is the figure's. Assurance "lives in precise, quiet type".
- **Size is bound to level.** No separate size prop, so a generated screen can't make an `h3` look like an `h1`. Brief: "hierarchy comes from size and weight".
- **No rule under level 2.** A hairline is the edge between surfaces, not decoration (brief, Elevation: "separated by a `line` hairline"; banned: broadsheet hairline rules).
- **No built-in margin and no breakpoint sizes.** Spacing is Stack's (ADR 0002); the UI spec has no responsive vocabulary.
- **Ink is plum, not near-black.** Brief: "Every neutral is tinted toward plum".
- **Matches the default** in tracking only on the title, where the brief asks for it, and in having no eyebrow, icon or accent of its own.
