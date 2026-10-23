# Text: component plan

## Use

A run of plain copy: a sentence, a short paragraph or a quiet note under something. Set `live` when the Text confirms an action's result in the state the action enters. For a title reach for Heading, for money reach for Amount, for a status reach for StatusTag.

## Anatomy

One slot, `root`, a `<p>` carrying `data-component="Text"`. Its copy is the `text` prop, a plain string. No children and no slots: the UI spec carries every string as a literal prop (ADR 0004, "every user-facing string is a literal prop"), and nothing nests inside a sentence. No Radix primitive: Text is not interactive.

## Variants, sizes, states

| Variant | Options | Default | Brief line behind it |
|---|---|---|---|
| `size` | `body`, `caption` | `body` | Spec § Component pieces 3 and ADR 0004 give Text `size`. Type: "Scale on a 14px base … 12, 14, 16, 20, 24, 32". `body` is the density's body size (14px admin, 16px contractor, density table); `caption` is the 12px step for a note under something. 20px and up belong to Heading, 32px to Amount's figure. |
| `tone` | `default`, `muted` | `default` | Spec and ADR 0004 give Text `tone`. Colour: "Roles: … `ink`, `ink-muted`". Text is copy, so only the two text neutrals. Status and accent tones are left out: "Status colours are their own set" belong to StatusTag with their word, and the accent is "for primary actions, selection and focus only". |
| `live` | boolean | `false` | Spec: "a `live` prop that renders it as a polite `role="status"` region, which confirms an action's result". ADR 0004: "a Text with `live` … in that state announces the result". No visual change: it is an a11y role, not a look. |

No `label` size: label is 600 for control and field labels, which those components own. No weight prop: "two weights keep hierarchy honest", and 600 belongs to titles, labels and figures.

States: none. Text is not interactive, so rest is its only state; hover, pressed, focus-visible, disabled and pending don't apply.

## Token map

| Slot | Variant | Classes | Why |
|---|---|---|---|
| `root` | `size: body` | `text-body` | Composite: 14/20 admin, 16/24 contractor, weight 400. |
| | `size: caption` | `text-caption` | Composite: 12/16, weight 400, at both densities. |
| | `tone: default` | `text-ink` | "Text is a plum-tinted ink, never `#000`." |
| | `tone: muted` | `text-ink-muted` | The quieter neutral; AA is checked on ink-muted at build time. |
| | `live` | none | Role only. |

No margin: spacing between siblings is Stack's (ADR 0002). No font family: the closed theme's `--default-font-family` is Instrument Sans.

## A11y contract

- **Role**: paragraph, from `<p>`, live or not. With `live`, the copy goes into Screen's persistent `role="status"` region when the Text mounts (#98, superseding a `role="status"` on the paragraph). That region is implicitly `aria-live="polite"` and `aria-atomic="true"`, so the whole sentence is read once, without interrupting.
- **Accessible name**: none needed; the text is the content.
- **Keyboard and focus**: not focusable. A live Text doesn't take focus either: the result is announced, and focus stays where the user acted (the Button).
- **Disabled, busy**: not applicable.
- **Target size**: none; not a target.

## Motion

None of its own. A live Text appears when the screen enters an action's result state, and that change runs as a View Transition owned by `useScreenState` (ADR 0011), not by Text. Reduced motion: nothing to reduce.

## Against defaults

The default version: shadcn has no Text component; screens write `<p className="text-sm text-muted-foreground">` or a typography `<p className="leading-7 [&:not(:first-child)]:mt-6">`, with grey `muted-foreground` and margin baked in.

How this one differs:

- **Two sizes, both from the brief's scale.** `body` follows the density (14 → 16) rather than a fixed `text-sm`. Brief: "Body text 14px / 16px" in the density table.
- **Muted is plum, not grey.** Brief: "Every neutral is tinted toward plum. No pure grey."
- **No built-in margin.** Spacing is Stack's (ADR 0002), so a Text never pushes its neighbours by its own rule.
- **A live region is a prop, not a separate Alert.** Spec: Text's `live` "confirms an action's result". shadcn reaches for an `Alert` box with an icon and a coloured border; here the result is a plain sentence, warm in its words rather than its chrome. Brief: "Warmth lives in colour, copy and softened corners".
- **No error or success tone.** shadcn adds `text-destructive`; the brief has no error text role, and an error "says what happened and what to do next" in words. See GAPS.md.
- **Matches the default** in being a bare paragraph with no max-width, where the brief is silent on line length (see GAPS.md).
