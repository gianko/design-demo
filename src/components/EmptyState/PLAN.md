# EmptyState: component plan

## Use

What a list shows in its empty screen state: why it's empty and, where it helps, what will appear there and when. A screen reaches for it in place of its DataTable, shown `when: [empty]`, with the PageHeader above it left as it is. It isn't for copy that stays whatever the data (Text), for an action's result (Toast), or for the facts of one thing (Card), and it never sits inside a Card.

Registry `use`: "What a list shows in its empty screen state: title says why the list is empty, and text, where it helps, what will appear there and when. Put it where the DataTable goes, shown when: [empty], with the DataTable left out of that state and the PageHeader kept; never inside a Card. For copy that shows whatever the data use Text; for an action's result Toast."

## Anatomy

Three `tv()` slots on plain elements, no Radix primitive (nothing to open, focus or announce).

- `root`: a `<div data-component="EmptyState">`, the list's frame: the same flat surface DataTable draws, so the empty list sits where the table would and keeps its outline.
- `title`: a `<p>`, why the list is empty ("No invoices to pay").
- `text`: a `<p>`, what will appear there and when; rendered only when given.

Props: `title` (required string) and `text` (optional string), both literals from the UI spec (ADR 0004). No slots: an empty state says two things, and anything more (a Button, an icon) is a choice a generated screen can get wrong.

## Variants, sizes, states

- **No variants.** Admin ("No invoices to pay, new ones show up here") and contractor ("No invoices yet, your first shows up here") differ only in copy and density, and density is a scope (ADR 0001, ADR 0002).
- **With text / title only**: the issue's "where it helps". A reason that says it all ("No failed payments") needs no second line.
- **Not interactive**: no hover, pressed, focus-visible, disabled or pending. It's what the screen shows while its state is `empty`, so its only "states" are present or absent, which the screen's View Transition crossfades.
- **Long copy wraps** within the density's measure; a phone story checks the frame stays inside the screen.

## Token map

| Slot | Classes | Brief line behind it |
|---|---|---|
| `root` | `flex flex-col gap-3xs rounded-surface border border-line bg-surface p-surface` | Elevation: "flat (page and cards, separated by a `line` hairline)", and DataTable's own frame (`rounded-surface border border-line bg-surface`), so the empty list keeps the table's outline. Radius table: surfaces 8px admin, 12px contractor. `p-surface` (20/24px), a surface's padding, as Card has. `gap-3xs` (4px) keeps the two lines one unit, as PageHeader's title and description. No shadow: it doesn't float. Full width of its column, as the table it stands in for. |
| `title` | `max-w-measure text-label text-ink` | Type: "hierarchy comes from size and weight": body size at 600, the weight of the column headers it stands in for, so it leads without a bigger size. Body text 14px admin, 16px contractor. Measure keeps a long reason to about 65 characters a line. |
| `text` | `max-w-measure text-body text-ink-muted` | `ink-muted` for secondary detail, as Text's muted tone. `p` wraps `pretty` (src/styles.css). |

## A11y contract

- **Role**: none. It's ordinary content the screen shows in its empty state, read in order after the PageHeader. Not a live region: Screen has the one status region, and an empty list is the state the screen opens in, not a result to announce.
- **Accessible name**: none needed; nothing is a control.
- **Title semantics**: a paragraph, not a heading, so it adds nothing to the outline gate 1 checks and can't skip a level wherever it's placed (a gap: P0's empty states used a level 2 Heading).
- **Keyboard and focus**: nothing focusable.
- **Contrast**: ink and ink-muted on `surface`, both AA pairs the token build checks; axe (gate 4) re-checks both themes.
- **Target size**: nothing to target.

## Motion

None of its own. It enters and leaves with its screen state, through the library's View Transition (ADR 0011): src/styles.css crossfades every state change at `base` (`standard`, the leaving view at `base-exit`, `exit`), and at `fast` under reduced motion. The empty state is never a confirmed result, so nothing settles. No entrance animation on page load (brief: banned).

## Against defaults

The default is shadcn's `Empty`: a centred column inside a dashed-border box, a muted circle or rounded tile holding a large icon, a bold title, a muted description, and a primary button ("Create your first invoice").

How this one differs:

- **Left-aligned in the table's own frame, not centred in a dashed box.** The empty state stands where the list would, so it borrows the list's solid hairline and radius (brief: flat surfaces "separated by a `line` hairline"); a dashed edge reads as a drop zone, and a centred column as a marketing panel.
- **No icon or icon tile.** Phosphor arrives with IconButton later, and the icon above a heading is the template tell (`icon-tile-stack` in RULES.md names EmptyState as the one place it could creep in). The copy carries the meaning (brief: plain-spoken).
- **No button.** No P1 brief asks an empty list to start anything, and an action belongs to the screen's PageHeader (a gap).
- **Body-size title at 600, not a large heading.** Quiet components; hierarchy from weight (brief: Type).
- **Matches the default**, where the brief is silent: a title and a muted line under it.
