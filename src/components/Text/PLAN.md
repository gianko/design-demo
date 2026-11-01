# Text: component plan

## Use

A run of plain copy: a sentence, a short paragraph or a quiet note under something. Never an action's result: that is a Notice or a Toast ([ADR 0016](../../../docs/adr/0016-an-actions-result-on-a-card-is-a-notice-on-its-bottom-edge.md)). For a title reach for Heading, for money reach for Amount, for a status reach for StatusTag.

## Anatomy

One slot, `root`, a `<p>` carrying `data-component="Text"`. Its copy is the `text` prop, a plain string. No children and no slots: the UI spec carries every string as a literal prop (ADR 0004, "every user-facing string is a literal prop"), and nothing nests inside a sentence. No Radix primitive: Text is not interactive.

## Variants, sizes, states

| Variant | Options | Default | Brief line behind it |
|---|---|---|---|
| `size` | `body`, `caption` | `body` | Spec § Component pieces 3 and ADR 0004 give Text `size`. Type: "Scale on a 14px base … 12, 14, 16, 20, 24, 32". `body` is the density's body size (14px admin, 16px contractor, density table); `caption` is the 12px step for a note under something. 20px and up belong to Heading, 32px to Amount's figure. |
| `tone` | `default`, `muted` | `default` | Spec and ADR 0004 give Text `tone`. Colour: "Roles: … `ink`, `ink-muted`". Text is copy, so only the two text neutrals. Status and accent tones are left out: "Status colours are their own set" belong to StatusTag with their word, and the accent is "for primary actions, selection and focus only". |

No `live`: until ADR 0016 a live Text confirmed an action's result by announcing its copy; a result is now a Notice or a Toast, which announce themselves, so Text's schema takes no `live`.

No `label` size: label is 600 for control and field labels, which those components own. No weight prop: "two weights keep hierarchy honest", and 600 belongs to titles, labels and figures.

States: none. Text is not interactive, so rest is its only state; hover, pressed, focus-visible, disabled and pending don't apply.

## Token map

| Slot | Variant | Classes | Why |
|---|---|---|---|
| `root` | `size: body` | `max-w-measure text-body` | Composite: 14/20 admin, 16/24 contractor, weight 400. `max-w-measure` caps a line at about 65 characters (412px admin, 472px contractor; #95), a ceiling, so a narrower container still sets the width. |
| | `size: caption` | `text-caption` | Composite: 12/16, weight 400, at both densities. |
| | `tone: default` | `text-ink` | "Text is a plum-tinted ink, never `#000`." |
| | `tone: muted` | `text-ink-muted` | The quieter neutral; AA is checked on ink-muted at build time. |

No margin: spacing between siblings is Stack's (ADR 0002). No font family: the closed theme's `--default-font-family` is Instrument Sans.

## A11y contract

- **Role**: paragraph, from `<p>`. It announces nothing: an action's result is a Notice or a Toast, which hand their copy to Screen's status region.
- **Accessible name**: none needed; the text is the content.
- **Keyboard and focus**: not focusable.
- **Disabled, busy**: not applicable.
- **Target size**: none; not a target.

## Motion

None of its own. A Text that a screen state brings in or takes out changes with that state's View Transition, owned by `useScreenState` (ADR 0011), not by Text. Reduced motion: nothing to reduce.

## Against defaults

The default version: shadcn has no Text component; screens write `<p className="text-sm text-muted-foreground">` or a typography `<p className="leading-7 [&:not(:first-child)]:mt-6">`, with grey `muted-foreground` and margin baked in.

How this one differs:

- **Two sizes, both from the brief's scale.** `body` follows the density (14 → 16) rather than a fixed `text-sm`. Brief: "Body text 14px / 16px" in the density table.
- **Muted is plum, not grey.** Brief: "Every neutral is tinted toward plum. No pure grey."
- **No built-in margin.** Spacing is Stack's (ADR 0002), so a Text never pushes its neighbours by its own rule.
- **No error or success tone.** shadcn adds `text-destructive`; the brief has no error text role, and an error "says what happened and what to do next" in words. See GAPS.md.
- **A measure on body copy.** The default paragraph has no max-width; this one stops at about 65 characters a line (see GAPS.md, #95).
