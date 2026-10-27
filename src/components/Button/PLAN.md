# Button: component plan

## Use

An action the person takes, labelled with what happens ("Send reminder", "Approve and pay"); `primary` for the screen's one main action, `secondary` beside it, `quiet` for a minor one. Give it `action` when it runs a declared action, and the code step shows its pending state. For a status use StatusTag; for copy use Text.

## Anatomy

Three slots, no Radix primitive: a native `<button type="button">` does everything a Radix part would (spec § Component pieces 7 asks for nothing a native button lacks).

- `root`: the `<button>`, carrying `data-component="Button"`. Its content is the label.
- `edge`: the progress edge, a `<span aria-hidden>` along the button's bottom, rendered only while pending. It runs the one fill (`scaleX`).
- `sweep`: inside `edge`, the painted bar, which runs the sweep (`translateX`). Two elements, because the fill and the sweep both animate `transform`, and one element can run only one `animate-*` token.

Props:

- `text`: the label, a string, as Text and Heading take their copy (`.out-of-scope/copy-as-children.md`). Button has no `body` slot and no other registry slot.
- `intent`: `primary`, `secondary` or `quiet`, required.
- `disabled`, `pending`: booleans. `pending` is the code step's: it passes `<action>.pending` from `useAction` (ADR 0011, "Button owns pending").
- React's own: `onClick`, `ref`.

No icon slot: the Phosphor icon map arrives with the first component that needs an icon, probably IconButton (spec § After the slice), and no P0 brief puts an icon on a Button.

## Variants, sizes, states

| Variant | Options | Brief line behind it |
|---|---|---|
| `intent` | `primary`, `secondary`, `quiet`; required | Spec § Component pieces 7: "primary, secondary and quiet intents". Colour: the accent is "for primary actions"; `control` is "the 3:1 edge of an input or secondary button". Required, as StatusTag's `status` is: a default would be a hierarchy the screen never chose. |

No size variant: "Buttons … share the control height", and density sets it (ADR 0002). No `destructive` intent: no P0 brief has one, and status colours "never borrow" the accent's job.

States, each distinct from rest:

| State | How it shows | Brief line |
|---|---|---|
| rest | fill and ink per intent | Radius, Colour |
| hover | fill deepens one step | "`accent-hover` … deepen the accent; `surface-hover` … deepen a neutral control" |
| pressed | fill deepens again | "`accent-pressed`", "`surface-pressed`" |
| focus-visible | 2px heather outline, 2px off | "The focus ring shows on keyboard focus only" |
| disabled | the intent's shape, its colour drained: `disabled` text; primary a `disabled` fill, secondary its `surface` fill and a `disabled` edge, quiet bare | "`disabled` and its text are a flat, quiet neutral"; "A disabled control keeps its intent's shape"; "natively disabled and leaves the tab order" |
| pending | rest colours, the progress edge along the bottom, no hover or pressed change | "a pending action shows a progress edge along its button's bottom"; "keeps its label as written" |

## Token map

| Slot | When | Classes |
|---|---|---|
| `root` | always | `inline-flex h-control items-center justify-center rounded-control px-control text-label whitespace-nowrap transition-colors duration-fast ease-standard focus-visible:focus-ring` |
| | `primary` | `bg-accent text-on-accent` |
| | `primary`, not pending | `hover:bg-accent-hover active:bg-accent-pressed` |
| | `secondary` | `border border-control bg-surface text-ink` |
| | `secondary`, not pending | `relative before:absolute before:inset-0 before:rounded-control before:transition-colors before:duration-fast before:ease-standard hover:before:bg-surface-hover active:before:bg-surface-pressed`: the translucent hover lies over the `surface` fill (#250) |
| | `quiet` | `text-ink` |
| | `quiet`, not pending | `hover:bg-surface-hover active:bg-surface-pressed` |
| | disabled (any intent) | `text-disabled`, and no hover or pressed classes |
| | `primary`, disabled | `bg-disabled` |
| | `secondary`, disabled | `border border-disabled bg-surface` |
| | `quiet`, disabled | none: no fill and no edge |
| | pending | `relative overflow-hidden` (the edge's box and its clip to the corners) |
| `edge` | pending | `absolute inset-x-0 bottom-0 h-edge origin-left animate-progress-fill motion-reduce:animate-none` |
| `sweep` | pending | `block h-full w-0 animate-progress-sweep motion-reduce:w-1/3 motion-reduce:translate-x-full motion-reduce:animate-none` |
| | `primary` | `bg-progress` |
| | `secondary`, `quiet` | `bg-accent` |

Only secondary has a border, and it keeps it, in `disabled`, when disabled, so it still reads as a button and enabling it doesn't shift its width. (The first build gave every intent a transparent border so the three matched widths; the critique cut it as the one accessory, which also seats primary's edge on its bottom row.) Radius `rounded-control` (6px) is the radius table's "Buttons". Disabled quiet stays bare (#145): a `disabled` fill made it more prominent than an enabled quiet button at rest, and the same fill as a hovered one.

## A11y contract

- **Role**: `button`, native.
- **Accessible name**: the label; it is never replaced, pending included.
- **Keyboard**: Enter and Space, native. Focus ring on `:focus-visible` only.
- **Disabled**: native `disabled`, so it leaves the tab order and is announced unavailable.
- **Pending**: `aria-busy="true"` and `aria-disabled="true"`, never native `disabled`, so focus stays on it mid-operation; clicks do nothing. The result is announced by whatever confirms it (a live Text), not the Button.
- **Target size**: `h-control` is 32px admin (above the 24px floor) and 44px contractor (the 44px minimum); the label and side padding keep the width above both.

## Motion

| User action | Motion |
|---|---|
| hover, press | background colour, `transition-colors duration-fast ease-standard` ("`fast` 120ms (press, hover colour)") |
| starts an action (pending) | the edge fills once, left to right, over `slow` with `standard` (`animate-progress-fill`), then sweeps, one `loop` per pass, linear, until pending ends (`animate-progress-sweep`) |
| result arrives | pending ends with the screen-state View Transition (ADR 0011); the edge leaves with it |

Reduced motion: `motion-reduce:animate-none` on both edge parts leaves a static edge, as the brief says: `motion-reduce:` sets the sweep to the middle third, so a still edge reads as busy rather than as a bottom border. Without reduced motion the sweep has no width at rest, so the gate's still shots (rest, focus, hover, pressed) show no line; only the mid-animation shot shows the edge, and no shot shows the reduced-motion edge. While the sweep runs, its keyframes set it to full width, and its `backwards` fill holds that during its delay. The colour transitions are already a `fast` crossfade. No `settle`: nothing the Button shows is a confirmed result.

## Against defaults

The default version: shadcn's `Button`, a `cva()` with `default`, `destructive`, `outline`, `secondary`, `ghost` and `link` variants and four sizes, `rounded-md`, `h-9 px-4`, `font-medium`, `focus-visible:ring-[3px]`, a disabled state at `opacity-50`, and loading left to the caller (usually a spinner icon swapped in for the label).

How this one differs:

- **Three intents, no sizes.** Spec: "primary, secondary and quiet intents"; brief: controls "share the control height". Each fewer option is one less a screen can get wrong.
- **Pending is the component's, as an edge, not a spinner.** Brief: "a progress edge along its button's bottom", "keeps its label as written", "marked busy … stays focusable". A spinner that replaces the label is what the brief's pending rules exist to avoid.
- **Disabled is a colour role, not opacity.** ADR 0002: "`opacity-*` is banned; disabled states use colour roles."
- **Heather, not indigo or black.** Brief: the one accent "for primary actions"; banned: "the 8px-grid indigo button".
- **Density heights, not `h-9`.** 32px admin, 44px contractor, from the brief's density table.
- **Focus is an outline, offset, in the accent.** Brief: focus ring on keyboard only, 3:1; ADR 0002's `focus-ring`.
- **Label weight 600** (`text-label`), the brief's only bold weight, where shadcn uses 500, which the brief's two weights rule out.
- **Matches the default** in its 6px radius (the radius table says so), its colour-only hover with no lift or shadow (the brief bans lift and is otherwise silent), and in the secondary's bordered surface, where the brief's `control` role says the same.
