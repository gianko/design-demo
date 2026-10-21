# Design brief

The source of taste for the design system. Every token, component and generated screen is built against this page. Where it speaks, it overrides `frontend-design` and any other default.

## Personality: warm, assured, plain-spoken

The product moves other people's money, so it has to feel trustworthy without feeling cold. Warmth lives in type, radius, colour and copy; assurance lives in precision; motion is the one loud thing. When a case isn't covered here, pick whatever is most warm, assured and plain-spoken.

## Who it's for

Two people use the screens, and density follows who's looking.

- **Admin screens use working density**: 46px rows, 14px body, 28px page padding, 24px minimum targets. _Why: the admin is the primary user and clears dozens of invoices a day on a desktop._
- **Contractor screens use full room**: 60px rows, 15px body, 36px page padding, 44px minimum targets. _Why: the contractor visits a few times a month, often on a phone, and wants reassurance more than throughput._
- Warmth is the same at both densities; only size and spacing change. See [ADR 0001](adr/0001-density-by-audience.md).

## References (principles, never pixels)

- **Stripe Dashboard**: how money and status read in dense tables.
- **Gusto**: warmth that still works for a payroll admin.
- **Linear**: motion only when the user acts, never as decoration.

## Type

A soft serif for moments, a friendly sans for work.

- **Fraunces** (`SOFT` 100, `WONK` off, optical size auto, weight 500) for page titles, card titles and a single large figure. Never body, labels or tables. _Why: warmth without the high-contrast editorial serif look._
- **Figtree** for everything else, weights 400 and 600 only. _Why: open, friendly shapes; two weights keep hierarchy honest._
- Scale on a 14px base, ratio about 1.2: 12, 14, 16, 20, 24, 32. Nothing off the scale.
- Sentence case everywhere. No ALL-CAPS labels or table headers; headers are 12–13px, 600, `ink-muted`.
- **Amounts** always use tabular figures, show cents, and right-align in tables. In tables: `4,800.00 USD`. On a single-currency card: `$4,800.00`. _Why: multi-currency lists must be impossible to misread, and digits must line up._

## Colour

Colour is assigned by role; components never name a hue.

- **Roles**: `bg`, `surface`, `surface-raised`, `ink`, `ink-muted`, `line`, `accent`, `accent-ink`, `selected`, and status pairs for `awaiting`, `overdue`, `paid`, `scheduled`, `failed`.
- **One accent, berry** (about `#7B3F73` light, `#D9A2CE` dark): primary actions, selection and focus only. _Why: one accent keeps "what can I do here" obvious._
- **Status colours are their own set** and never borrow the accent: amber awaiting, red overdue, green paid, blue scheduled, solid red failed.
- **Every neutral is tinted toward plum.** No pure grey. Text is a plum-tinted ink (about `#2B2230`), never `#000`. _This deliberately opts into tinted ink for text, which `frontend-design` lists as a default._
- **Light is primary.** Dark gives every role its own value; it is not an inversion. Dark `bg` is a deep plum-tinted dark, not black; surfaces get lighter as they rise; the accent lightens until it passes AA.
- All text passes WCAG AA (4.5:1); focus rings and control edges pass 3:1.

## Space, radius, elevation

- **Spacing** on a 4px base, named steps only: 4, 8, 12, 16, 20, 24, 32, 40, 48, 64. Off-scale values fail lint.
- **Radius by role**: pills for anything you press or that shows status (buttons, chips, status pills); 8px for anything you type into (inputs, selects, checkboxes); 10px (admin) or 14px (contractor) for surfaces; round avatars. Nested corners stay concentric (inner = outer − padding). _Why: one radius everywhere is a default, not a choice._
- **Elevation, three levels**: flat (page and cards, separated by a `line` hairline), raised (sticky and floating bars, toasts: one soft plum-tinted shadow), overlay (modal, sheet, menu: a deeper shadow and a scrim). A shadow means "this floats", never "this is a box". In dark mode, levels are lighter surfaces.

## Motion

Motion confirms what the user just did. It is the system's signature, so it is precise rather than plentiful.

- **Durations**: `fast` 120ms (press, hover colour), `base` 240ms (state change, selection), `slow` 320ms (sheet, modal, toast entering). Exits run at about 70% of the enter duration.
- **Easings**: `standard` (ease-out) by default; `exit` (ease-in) for leaving; `settle`, a single overshoot of about 4% with no second swing, only for confirming something the user did (a status flipping after pay, a toast arriving). Never on exits, never on anything the system starts.
- **Expected**: selection, the bulk-action bar entering and handing off to its toast, status changes staggered across rows, sheets opening from their trigger.
- **Banned**: bounce or elastic easing (more than one swing), entrance animations on page load, hover lift on cards or rows, anything that loops.
- **Signature transitions**: (1) pay → statuses flip in a stagger → the bar becomes the toast; (2) a row expands into the invoice-detail sheet.
- **Reduced motion**: everything becomes a `fast` crossfade.

## Icons and copy

- **Phosphor**, regular weight: 16px on admin screens, 20px on contractor screens.
- **Copy** is second person, active and specific: "Your money is on its way", "Approve and pay", "Arrives Oct 20", never "soon". No exclamation marks, no emoji, no jokes in errors. Errors say what happened and what to do next. Admin copy is terser; the warmth stays.

## Banned

Named here so the brief stands on its own.

- **Fonts**: Inter, Geist, Roboto, Arial, Space Grotesk.
- **Palette**: Tailwind palette names or values as the palette; purple or indigo gradients; terracotta or clay; cream backgrounds (~`#F4F1EA`); high-contrast display serifs.
- **Silhouettes**: shadcn defaults; one radius everywhere; the 8px-grid indigo button.
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

- The exact berry accent and its dark-mode partner.
- Fraunces with `SOFT` at 100: warm, or tipping into cute?
- Two densities instead of one.
- The plum tint on every neutral.
