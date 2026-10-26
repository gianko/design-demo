# Design brief

The source of taste for the design system. Every token, component and generated screen is built against this page. Where it speaks, it overrides `frontend-design` and any other default.

## Personality: warm, assured, plain-spoken

The product moves other people's money, so it has to feel trustworthy without feeling cold. Warmth lives in colour, copy and softened corners; assurance lives in precise, quiet type; motion is the one loud thing. When a case isn't covered here, pick whatever is most warm, assured and plain-spoken.

## Who it's for

Two people use the screens, and density follows who's looking.

| | Admin: working density | Contractor: full room |
|---|---|---|
| Row height | 46px | 60px |
| Body text | 14px | 16px |
| Label text | 14px | 16px |
| Page padding | 28px | 36px |
| Minimum target | 24px | 44px |
| Control height | 32px | 44px |
| Control side padding | 12px | 16px |

- **Admin screens are dense.** _Why: the admin is the primary user and clears dozens of invoices a day on a desktop._
- **Contractor screens have room.** _Why: the contractor visits a few times a month, often on a phone, and wants reassurance more than throughput._
- Buttons, icon buttons, inputs, selects and segmented filters share the control height, so controls in one row line up.
- 24px is a floor, not an exemption: targets still meet WCAG 2.2 target size, spacing rule included.
- Warmth is the same at both densities; only size and spacing change. See [ADR 0001](adr/0001-density-by-audience.md).

## References (principles, never pixels)

- **Stripe Dashboard**: how money and status read in dense tables.
- **Gusto**: warmth that still works for a payroll admin.
- **Linear**: motion only when the user acts, never as decoration.

## Type

One quiet family; hierarchy comes from size and weight, not from a second face.

- **Instrument Sans** for everything, titles and amounts included, weights 400 and 600 only. _Why: neutral and precise, so colour, copy and motion carry the warmth; two weights keep hierarchy honest._
- Titles (24px and up) and a single large figure use 600 with slightly tightened tracking (about −0.015em, −0.02em for the figure). There is no display face.
- Scale on a 14px base, ratio about 1.2: 12, 14, 16, 20, 24, 32. Nothing off the scale.
- Sentence case everywhere. No ALL-CAPS labels or table headers; headers are the body size, 600, `ink-muted`, so weight and colour set them apart, not size.
- **Amounts** always use tabular figures, show cents, and right-align in tables. In tables: `4,800.00 USD`. On a single-currency card: `$4,800.00`. _Why: multi-currency lists must be impossible to misread, and digits must line up._

## Colour

Colour is assigned by role; components never name a hue.

- **Roles**: `page`, `surface`, `surface-raised`, `ink`, `ink-muted`, `line`, `accent`, `on-accent`, `selected`, and status pairs for `awaiting`, `overdue`, `paid`, `scheduled`, `failed`.
- **State roles**: `accent-hover` and `accent-pressed` deepen the accent; `surface-hover` and `surface-pressed` deepen a neutral control; `control` is the 3:1 edge of an input or secondary button (`line` stays a hairline between surfaces); `disabled` and its text are a flat, quiet neutral; `scrim` sits behind overlays. Each has its own value in dark mode. A disabled control keeps its intent's shape: a filled button keeps a `disabled` fill, a bordered one keeps its edge in `disabled`, and a bare one stays bare.
- **One accent, heather** (about `#80527A` light, `#D8B4D2` dark): a dusty berry for primary actions, selection and focus only. _Why: one accent keeps "what can I do here" obvious._
- **The focus ring shows on keyboard focus only** (`:focus-visible`), never on click. _Why: a ring on a clicked button reads as "selected"._
- **Status colours are their own set** and never borrow the accent:

  | Awaiting | Overdue | Paid | Scheduled | Failed |
  |---|---|---|---|---|
  | Amber | Red | Green | Blue | Solid red |

- **Colour alone never communicates state.** Every status tag carries its word. _Why: a colour-blind admin must still tell overdue from paid._
- **Every neutral is tinted toward plum.** No pure grey. Text is a plum-tinted ink (about `#2C2430`), never `#000`. _This deliberately opts into tinted ink for text, which `frontend-design` lists as a default._
- **Light is primary.** Dark gives every role its own value; it is not an inversion. Dark `page` is a deep plum-tinted dark, not black; surfaces get lighter as they rise; the accent lightens until it passes AA.
- WCAG AA in both themes: body text 4.5:1, large text 3:1, focus rings and the edges that identify a control 3:1.

## Space, radius, elevation

- **Spacing** on a 4px base, named steps only: 0, 4, 8, 12, 16, 20, 24, 32, 40, 48, 64. Off-scale values fail lint.
- **Radius by role, subtle, never a pill**:

  | Buttons, segmented filters | Inputs, selects | Status tags, checkboxes | Surfaces, admin | Surfaces, contractor | Avatars |
  |---|---|---|---|---|---|
  | 6px | 6px | 4px | 8px | 12px | Round |

  Nothing is fully rounded except avatars. Nested corners stay concentric (inner = outer − padding). _Why: softened corners keep some warmth without the friendly-app look; one radius everywhere is a default, not a choice._
- **Elevation, three levels**: flat (page and cards, separated by a `line` hairline), raised (sticky and floating bars, toasts: one soft plum-tinted shadow), overlay (modal, sheet, menu: a deeper shadow and a scrim). A shadow means "this floats", never "this is a box". In dark mode, levels are lighter surfaces.

## Motion

Motion confirms what the user just did. It is the system's signature, so it is precise rather than plentiful.

- **Durations**: `fast` 120ms (press, hover colour), `base` 240ms (state change, selection), `slow` 320ms (sheet, modal, toast entering). Exits run at about 70% of the enter duration.
- **Easings**: `standard` (ease-out) by default; `exit` (ease-in) for leaving; `settle`, a single overshoot of about 4% with no second swing, only for confirming something the user did (a status flipping after pay, a toast arriving). Never on exits, never on anything the system starts.
- **Expected**: selection, the bulk-action bar entering and handing off to its toast, status changes staggered across rows, sheets opening from their trigger, a pending action's progress edge.
- **Banned**: bounce or elastic easing (more than one swing), entrance animations on page load, hover lift on cards or rows, anything that loops.
- **The one loop**: a pending action shows a progress edge along its button's bottom that fills once over `slow`. If the operation is still running, the edge sweeps until the result arrives, then stops. The sweep wraps around: the full edge slides out to the right and back in from the left, one `loop` (1280ms) per pass, linear, so it never jumps. _Why: the wait has no known length, and a still button reads as frozen._ Reduced motion: a static edge.
- **Pending and disabled**: a pending button keeps its label as written, is marked busy and unavailable to assistive tech, and stays focusable so focus doesn't drop mid-operation; whatever confirms the result (the toast) announces it. A disabled control is natively disabled and leaves the tab order.
- **Signature transitions**: (1) pay → the bar shows pending → once the payment is confirmed, statuses flip in a stagger and the bar becomes the toast; (2) a row expands into the invoice-detail sheet.
- **Stagger**: only the rows whose status changed, in row order, 40ms apart; from the 8th row on they flip together. _Why: paying thirty invoices should still read as one confirmation._
- **Never show success before it's confirmed.** The stagger is the confirmation, not a guess. _Why: assured means the screen never claims money moved when it hasn't._
- **Reduced motion**: no movement, overshoot or stagger; changes become a `fast` crossfade. Everything works without animation.

## Icons and copy

- **Phosphor**, regular weight: 16px on admin screens, 20px on contractor screens.
- **Copy** is second person, active and specific: "Your money is on its way", "Approve and pay", "Arrives Oct 20", never "soon". No exclamation marks, no emoji, no jokes in errors. Errors say what happened and what to do next. Admin copy is terser; the warmth stays.

## Banned

Named here so the brief stands on its own.

- **Fonts**: Inter, Geist, Roboto, Arial, Space Grotesk.
- **Palette**: Tailwind palette names or values as the palette; purple or indigo gradients; terracotta or clay; cream backgrounds (~`#F4F1EA`); high-contrast display serifs.
- **Silhouettes**: shadcn defaults; one radius everywhere; pill-shaped buttons, tags or chips; the 8px-grid indigo button.
- **From `frontend-design`**, restated:
  1. Accenting one word in a headline with italic, bold or colour.
  2. All caps for labels.
  3. Unnecessary typographic labels above content.
  4. Numbered markers (01 / 02 / 03) unless the content is a real sequence.
  5. Big number + small label + supporting stats + gradient as the default hero.
  6. Fade-and-slide-up entrances on sections; hover transitions on every card.
  7. The font families you'd reach for on any other project.
  8. Warm cream background + high-contrast serif display + terracotta accent.
  9. Near-black background + a single acid-green or vermilion accent.
  10. Broadsheet: hairline rules, zero radius, dense newspaper columns.
  11. The SaaS-card kit: identical rounded cards, one radius, one `rgba(0,0,0,.1)` shadow, gradient washes.
  12. Template chrome: tracked-out ALL-CAPS eyebrows, `A · B · C` meta strings, `WORD — fragment` labels, monospace for small data labels, `→` appended to links and buttons. (Tinted ink for text is the one item opted into, above.)

## Calls I'd hand to a designer

I made these and would want a designer's eye on them first:

- The heather accent: does it carry primary actions on a busy screen?
- Instrument Sans alone, with no display face: is there enough hierarchy and warmth?
- Two densities instead of one.
- The plum tint on every neutral.
