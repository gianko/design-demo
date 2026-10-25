# StatusTag: component plan

## Use

An invoice's or payment's status as a small tinted tag that always carries its word (Awaiting, Overdue, Paid, Scheduled, Failed); bind `status` to the invoice's status, and never write a status into a Text or colour anything else by status. For copy use Text, for money Amount.

## Anatomy

One slot, `root`, a `<span>` carrying `data-component="StatusTag"`. Its content is the status word, which StatusTag owns: the screen passes `status` and never writes the word. That way the colour and the word can't disagree, and a bound status always renders its word (brief: "Every status tag carries its word"). No children, no registry slots, no Radix primitive: StatusTag isn't interactive.

Props, from spec § Component pieces 6 ("the five status pairs, each with its word"):

- `status`: `awaiting`, `overdue`, `paid`, `scheduled` or `failed`, required. The same five values as the fixtures' `InvoiceStatus`, so a `{ "bind": "overdueInvoice.status" }` prop fits.

The words are the brief's own, from its status table: Awaiting, Overdue, Paid, Scheduled, Failed. Sentence case (one word each, so a capital first letter only).

## Variants, sizes, states

| Variant | Options | Default | Brief line behind it |
|---|---|---|---|
| `status` | `awaiting`, `overdue`, `paid`, `scheduled`, `failed` | none: required | Colour: "status pairs for `awaiting`, `overdue`, `paid`, `scheduled`, `failed`" and the table "Amber, Red, Green, Blue, Solid red". Required, as Amount's `display` is: a default status would be a status the data never said. |

No size variant: density sets the size (ADR 0002: "components use density-role tokens and never know which density they're in"). No icon: the word already keeps colour from being the only signal, and the Phosphor icon map waits for the first component that needs an icon (spec § After the slice). No `tone`, `outline` or `solid` choice: one look per status, so a generated screen can't pick the wrong one.

States: none. A status tag isn't interactive (it is a fact about the data, not a control), so rest is its only state; hover, pressed, focus-visible, disabled and pending don't apply. A filter by status is a segmented filter, a separate component.

## Token map

| Slot | Variant | Classes | Why |
|---|---|---|---|
| `root` | always | `inline-block rounded-tag px-2xs text-label` | Radius table: "Status tags, checkboxes: 4px" (`rounded-tag`), "never a pill". `px-2xs` (8px) on the 4px scale gives the word room on each side; the line height of `label` gives the height, so the tag is no taller than the text line it sits in. `text-label`: density size (14px admin, 16px contractor) at 600, so the word reads at the row's size and holds its own beside body copy without a border or icon. Every word is one word, so nothing needs to stop it wrapping (the critique cut `whitespace-nowrap` as the one accessory). |
| | `awaiting` | `bg-awaiting text-awaiting` | Amber pair. |
| | `overdue` | `bg-overdue text-overdue` | Red pair. |
| | `paid` | `bg-paid text-paid` | Green pair. |
| | `scheduled` | `bg-scheduled text-scheduled` | Blue pair. |
| | `failed` | `bg-failed text-failed` | "Solid red": the one solid fill, with the light text its token pairs with. |

Each pair is AA-checked in both themes by the token build (ADR 0005). No border and no shadow: the tint is the edge, and "a shadow means this floats".

## A11y contract

- **Role**: none; a `<span>` of text. The word is the content and is what is read: "Overdue". Not `role="status"`: that is a live region, and a tag rendered in every row would announce itself; results are announced by a live Text (spec § Component pieces 3).
- **Accessible name**: none needed; the word is the text.
- **Keyboard and focus**: not focusable.
- **Disabled, busy**: not applicable.
- **Target size**: none; not a target.
- **Colour alone**: never; the word is always rendered, and the hue is only a second channel. Status text pairs meet 4.5:1 on their tint.

## Motion

None owned by StatusTag. The one status motion in the brief, "statuses flip in a stagger" after pay, belongs to the screen-state View Transition and DataTable's stagger (ADR 0011), which animate whole rows; a tag only renders the status it is given. No pulse or dot animation: "Banned: anything that loops". Reduced motion: nothing to reduce.

## Against defaults

The default version: shadcn's `Badge`, a `rounded-full` pill (`rounded-md` in later versions) at `text-xs font-semibold`, with `default`, `secondary`, `destructive` and `outline` variants a screen picks by hand, and the label as free children; status colour comes from ad-hoc `bg-green-100 text-green-800` classes, often with a leading coloured dot.

How this one differs:

- **4px tag radius, not a pill.** Radius table: "Status tags: 4px"; banned: "pill-shaped buttons, tags or chips".
- **Variants are statuses, not looks.** The screen says what the status is, and the tag picks the pair. Brief: "Colour is assigned by role; components never name a hue."
- **The word is owned, not free text.** Brief: "Every status tag carries its word." A free label could say "Paid" on an overdue tint.
- **Failed is solid, the rest are tints.** Brief's table: "Solid red" for failed only. The default's `destructive` is solid red for any danger.
- **No dot, no icon.** The word carries the meaning; a dot is the generic default, and an icon would be decoration the brief doesn't ask for.
- **Density size, not `text-xs`.** 12px would shrink the one thing an admin scans a list for; the label role follows density, as body text does.
- **Matches the default** in being a non-interactive inline `<span>` with a tinted fill and no border, where the brief is silent.
