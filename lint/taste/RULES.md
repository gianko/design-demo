# Taste rules

Taste lint is gate 7: the gate that holds code and rendered output to the [design brief](../../docs/design-brief.md)'s taste beyond what tokens can enforce. It is made of 16 taste rules. Static rules run in ESLint as `taste/<rule>` on TSX and CSS. Render rules run in the Playwright pass over every story in light/dark × admin/contractor, and over every generated screen ([ADR 0006](../../docs/adr/0006-one-gated-build-component-session-per-component.md)). Every rule is an error. Taste lint hard-fails the design system from its first component, and it hard-fails generated screens once the design system passes clean.

Library components take no `className` ([ADR 0002](../../docs/adr/0002-token-only-tailwind-and-eslint-token-lint.md)), so static rules mainly guard the library. On generated screens, composition failures surface through the render rules.

Five rules are reimplemented from [impeccable](https://github.com/pbakaus/impeccable)'s detector (Apache 2.0, read at commit `dad8dbb`). Five more adapt or merge impeccable rules. The other six are new, written for what the design brief demands in density, type and motion. No code is copied, and impeccable is not a dependency. See [the full triage of impeccable's 61 rules](#impeccables-61-rules) below.

## The 16 rules

The Ships column marks a rule that is on. **P0** marks the five that ship in the P0 vertical slice. Between them they prove both harnesses, and none depends on which four components the slice builds. **P1** marks a rule P1 turns on.

| Rule | Ships | Origin | Check | Fails when | Brief line it enforces |
|---|---|---|---|---|---|
| `motion-tokens` | **P0** | new; adapts `bounce-easing` | static | A transition or animation lacks a `duration-*` or `ease-*` token. `transition-all` is used. `ease-settle` is used on an exit (`data-[state=closed]`, exit durations). A keyframe property swings back more than once. | Easings: `settle` is a single overshoot with no second swing, never on exits. Banned: bounce or elastic easing. |
| `no-pill` | **P0** | brief | static + render | Static: `rounded-full` outside the exempt components. Render: any non-exempt element's computed radius is ≥ half its height. | Nothing is fully rounded except avatars. |
| `type-on-scale` | **P0** | adapts `tiny-text` + `undersized-ui-text` | render | Visible text has a computed `font-size` outside {12, 14, 16, 20, 24, 32}px or a `font-weight` outside {400, 600}. This catches browser defaults such as a `<th>` at 700. | Scale 12–32, nothing off the scale; weights 400 and 600 only. |
| `tabular-numerals` | **P0** | new | render | Text that parses as money lacks `tabular-nums`. Money means grouped digits with two decimals, next to a currency symbol or ISO code. Also fails when a money cell in a table is not end-aligned. Dates and counts are out of scope. | Amounts always use tabular figures and right-align in tables. |
| `text-overflow` | **P0** | impeccable, kept | render | Text spills out of its box or collides with a neighbour, or `overflow: hidden` clips it without an ellipsis. | Admin screens are dense (long names, IBANs and big amounts in fixed columns). |
| `nested-cards` | **P1** | impeccable, kept | static + render | Static: a JSX `<Card>` inside a `<Card>`. Render: a painted surface inside another painted surface. | Elevation: a shadow means "this floats", never "this is a box". |
| `gray-on-color` | | impeccable, kept | render | Neutral muted text sits on a status-tinted or accent background. | Status colours are their own set. |
| `no-pure-neutral-text` | | brief | render | Computed text or `::placeholder` colour has zero chroma (pure black, grey or white). This catches browser defaults such as the placeholder grey. | Every neutral is tinted toward plum. Text is never `#000`. |
| `gradient-as-decoration` | | impeccable, 5 rules merged | static | Any `bg-linear-*`, `bg-radial-*`, `bg-conic-*`, `from-*`/`via-*`/`to-*`, `bg-clip-text`, `*-gradient(` or `background-clip: text`. | Banned: gradient washes; purple or indigo gradients. |
| `edge-treatment` | | impeccable, adapted (`gpt-thin-border-wide-shadow`, `side-tab`) | static | One slot carries both a border and a shadow. A shadow stands in for a border. A one-sided border is wider than the hairline. | Flat surfaces are separated by a `line` hairline; a shadow means "this floats". |
| `motion-reduced` | | new | render | Under `reducedMotion: 'reduce'`, a running animation or transition moves anything other than opacity, or runs longer than `fast`. | Reduced motion: no movement, overshoot or stagger; changes become a `fast` crossfade. |
| `action-transitions` | | new | render | On a generated or kept screen, clicking a declared action's Button under its success or failure fixture variant doesn't enter `to.success` or `to.failure` through a View Transition of type `confirm` or `fail` ([ADR 0011](../../docs/adr/0011-motion-follows-declared-state-changes-owned-by-the-library.md)). | Motion confirms what the user just did. Never show success before it's confirmed. |
| `content-hidden-at-rest` | | impeccable, kept | render | After animations settle, text that isn't `aria-hidden` stays at opacity 0, `visibility: hidden` or a zero-size clip. | Everything works without animation. |
| `skipped-heading` | | impeccable, kept | render | A heading's level is more than one deeper than the heading before it. axe `heading-order` is only Moderate, so gate 4 won't catch this. | Assured, precise type; hierarchy from size and weight. |
| `no-all-caps` | | brief; adapts `all-caps-body` | static + render | Static: `uppercase` or `text-transform: uppercase`. Render: computed `text-transform: uppercase`, or a visible word of 3+ letters in all caps that isn't on the allowlist. | Sentence case everywhere. No ALL-CAPS labels or table headers. |
| `target-size` | | brief | render | In a `data-density="contractor"` scope, an interactive element's hit area is under 44×44px. The hit area is the larger of the element's box and its associated `<label>`'s box. Inline links inside a sentence are exempt. | Minimum target: 24px admin, 44px contractor. |

## Exemptions

Exemptions live only in each rule's config, which a build session never edits (ADR 0006). Adding one is a human decision. Taste rules can't be suppressed inline: an `eslint-disable` that names a `taste/*` rule is an error, and render rules have no opt-out attribute.

| Rule | Exemption |
|---|---|
| `no-pill` | Avatar. |
| `no-all-caps` | ISO 4217 currency codes, IBAN, BIC, ID, VAT, PDF, CSV. |

## Placed elsewhere

These are taste concerns that another gate, the token build, or the test harness owns, so taste lint doesn't duplicate them.

| Concern | Where | Why |
|---|---|---|
| Off-scale spacing, radius, font, font-size, colour; raw letter-spacing and line-height (impeccable's `design-system-*`, `extreme-negative-tracking`, `wide-tracking`, `tight-leading`) | Gate 2, token lint | Only token values compile, and raw values fail lint. |
| `low-contrast` | Gate 4, axe `color-contrast` | It's Serious, so gate 4 already fails it. |
| Admin target size (24px) | Gate 4, axe `target-size` (`wcag22aa`) | WCAG 2.2 AA is the admin floor. |
| Neutral tokens have chroma > 0 (plum tint) | Token build validation ([ADR 0005](../../docs/adr/0005-dtcg-tokens-hand-built-into-css-ts-and-figma.md)) | Tokens change only outside build sessions, so they are checked once, at build time. |
| `settle` overshoots once, by ≤ ~5% | Token build validation | Same as above. |
| Elevation shadows are neutral (impeccable's `dark-glow`) | Token build validation | Same as above. |
| No banned font family (impeccable's `overused-font` + the brief's list) | Token build validation | Same as above. |
| `script-error` | Playwright harness | Every run asserts no `pageerror` or console error. The error Storybook logs for a failing `play` is gate 8's ([ADR 0012](../../docs/adr/0012-style-expectations-are-read-only-play-functions-run-by-gate-8.md)). |
| "Never `settle` on anything the system starts"; radius matches its role; concentric nested corners | Component review | A lint can't see intent or role. |

## Later

These rules join the set only when an eval run shows the failure they catch. Every taste rule is also a repair-loop failure mode, so a rule that fires on nothing real costs attempts and money.

| Rule | What it would catch |
|---|---|
| `text-occlusion` | Text painted under sticky table headers or columns. |
| `repeated-container-text` | A generated card saying "Overdue" in its title, tag and tooltip. |
| `marketing-buzzword` | Empty-state copy like "Streamline your payroll". |
| `heading-rhythm` | Space above a heading ≤ space below. This overlaps the brief-conformance gate. |

## Impeccable's 61 rules

Source: [`crates/foundation/src/registry.rs`](https://github.com/pbakaus/impeccable/blob/dad8dbb3aac21ad1fa236c110315ef4abece23e8/crates/foundation/src/registry.rs#L32) at commit `dad8dbb`, Apache 2.0. Triage: [Research impeccable's detector rules](https://github.com/gianko/design-demo/issues/6); ratified in [Choose taste lint rules](https://github.com/gianko/design-demo/issues/14). Tally: 6 kept, 13 adapted, 4 later, 38 skipped.

| # | Rule | What it detects | Decision | Reason |
|---|---|---|---|---|
| 1 | [`side-tab`](https://github.com/pbakaus/impeccable/blob/dad8dbb3aac21ad1fa236c110315ef4abece23e8/crates/foundation/src/registry.rs#L34) | Thick coloured border on one side of a card | Adapt → `edge-treatment` | A status stripe on overdue rows is a real temptation in invoicing. |
| 2 | [`border-accent-on-rounded`](https://github.com/pbakaus/impeccable/blob/dad8dbb3aac21ad1fa236c110315ef4abece23e8/crates/foundation/src/registry.rs#L44) | Thick accent border on a rounded element | Skip | Covered by `edge-treatment`; radius is token-owned. |
| 3 | [`overused-font`](https://github.com/pbakaus/impeccable/blob/dad8dbb3aac21ad1fa236c110315ef4abece23e8/crates/foundation/src/registry.rs#L54) | Inter, Roboto, Geist, Fraunces, Plus Jakarta Sans, Space Grotesk | Adapt → token build | The brief bans these fonts. Checked once on the font tokens; gate 2 stops anything off-token. |
| 4 | [`flat-type-hierarchy`](https://github.com/pbakaus/impeccable/blob/dad8dbb3aac21ad1fa236c110315ef4abece23e8/crates/foundation/src/registry.rs#L64) | Heading/body size steps < 1.25× | Skip | The brief fixes the scale at ~1.2, and `type-on-scale` holds rendered text to it. |
| 5 | [`gradient-text`](https://github.com/pbakaus/impeccable/blob/dad8dbb3aac21ad1fa236c110315ef4abece23e8/crates/foundation/src/registry.rs#L74) | `background-clip: text` gradients | Adapt → `gradient-as-decoration` | Merged. |
| 6 | [`ai-color-palette`](https://github.com/pbakaus/impeccable/blob/dad8dbb3aac21ad1fa236c110315ef4abece23e8/crates/foundation/src/registry.rs#L84) | Purple/violet gradients, cyan on dark | Skip | The palette is decided once in the brief and tokens; the gradient half is `gradient-as-decoration`. |
| 7 | [`cream-palette`](https://github.com/pbakaus/impeccable/blob/dad8dbb3aac21ad1fa236c110315ef4abece23e8/crates/foundation/src/registry.rs#L94) | Cream/beige page background | Skip | Palette choice is a brief decision, not drift a lint can catch. |
| 8 | [`nested-cards`](https://github.com/pbakaus/impeccable/blob/dad8dbb3aac21ad1fa236c110315ef4abece23e8/crates/foundation/src/registry.rs#L104) | Card inside card | **Keep** → `nested-cards` | Detail screens (invoice detail, payment status) invite it. |
| 9 | [`monotonous-spacing`](https://github.com/pbakaus/impeccable/blob/dad8dbb3aac21ad1fa236c110315ef4abece23e8/crates/foundation/src/registry.rs#L114) | One spacing value everywhere | Skip | Dense UIs legitimately repeat one step. |
| 10 | [`bounce-easing`](https://github.com/pbakaus/impeccable/blob/dad8dbb3aac21ad1fa236c110315ef4abece23e8/crates/foundation/src/registry.rs#L124) | Bounce/elastic easing (`cubic-bezier` y outside 0–1) | Adapt → `motion-tokens` | Our `settle` token is a single overshoot by design, so the check moves to easing tokens, exits and keyframe swings. An error here, though impeccable demoted it to advisory. |
| 11 | [`pulsing-dot`](https://github.com/pbakaus/impeccable/blob/dad8dbb3aac21ad1fa236c110315ef4abece23e8/crates/foundation/src/registry.rs#L134) | Small pulsing status dot | Skip | `animate-pulse`/`animate-ping` don't compile after the theme reset (ADR 0002); the one loop the brief allows is the progress edge. |
| 12 | [`blinking-cursor`](https://github.com/pbakaus/impeccable/blob/dad8dbb3aac21ad1fa236c110315ef4abece23e8/crates/foundation/src/registry.rs#L144) | Fake typing cursor in a hero | Skip | No heroes. |
| 13 | [`shape-assembled-illustration`](https://github.com/pbakaus/impeccable/blob/dad8dbb3aac21ad1fa236c110315ef4abece23e8/crates/foundation/src/registry.rs#L154) | Large inline SVG built from primitive shapes | Skip | No illustration; icons come from Phosphor. |
| 14 | [`organic-clip-path`](https://github.com/pbakaus/impeccable/blob/dad8dbb3aac21ad1fa236c110315ef4abece23e8/crates/foundation/src/registry.rs#L164) | Blob/torn-edge `clip-path` | Skip | Not a product-UI pattern. |
| 15 | [`buried-raster`](https://github.com/pbakaus/impeccable/blob/dad8dbb3aac21ad1fa236c110315ef4abece23e8/crates/foundation/src/registry.rs#L174) | Image hidden under an opaque wash | Skip | No raster imagery. |
| 16 | [`dark-glow`](https://github.com/pbakaus/impeccable/blob/dad8dbb3aac21ad1fa236c110315ef4abece23e8/crates/foundation/src/registry.rs#L184) | Coloured glow shadows | Adapt → token build | Elevation tokens must be neutral; raw shadows already fail gate 2. |
| 17 | [`radial-halo`](https://github.com/pbakaus/impeccable/blob/dad8dbb3aac21ad1fa236c110315ef4abece23e8/crates/foundation/src/registry.rs#L194) | Saturated radial-gradient background glow | Adapt → `gradient-as-decoration` | Merged. |
| 18 | [`radial-spotlight-glow`](https://github.com/pbakaus/impeccable/blob/dad8dbb3aac21ad1fa236c110315ef4abece23e8/crates/foundation/src/registry.rs#L204) | Translucent accent radial spotlight | Adapt → `gradient-as-decoration` | Merged. |
| 19 | [`marquee`](https://github.com/pbakaus/impeccable/blob/dad8dbb3aac21ad1fa236c110315ef4abece23e8/crates/foundation/src/registry.rs#L214) | Auto-scrolling content | Skip | Never produced from our registry. |
| 20 | [`icon-tile-stack`](https://github.com/pbakaus/impeccable/blob/dad8dbb3aac21ad1fa236c110315ef4abece23e8/crates/foundation/src/registry.rs#L224) | Rounded icon tile above a heading | Skip | Only EmptyState could; library composition is reviewed once per component. |
| 21 | [`italic-serif-display`](https://github.com/pbakaus/impeccable/blob/dad8dbb3aac21ad1fa236c110315ef4abece23e8/crates/foundation/src/registry.rs#L234) | Oversized italic serif hero headline | Skip | One sans family, no display type. |
| 22 | [`hero-eyebrow-chip`](https://github.com/pbakaus/impeccable/blob/dad8dbb3aac21ad1fa236c110315ef4abece23e8/crates/foundation/src/registry.rs#L244) | Uppercase eyebrow or pill above a hero H1 | Skip | No heroes; the caps and pill halves are `no-all-caps` and `no-pill`. |
| 23 | [`kicker-above-heading`](https://github.com/pbakaus/impeccable/blob/dad8dbb3aac21ad1fa236c110315ef4abece23e8/crates/foundation/src/registry.rs#L254) | Tiny tracked label above any heading | Skip | PageHeader composition is library-owned; breadcrumbs and record IDs above titles are legitimate. |
| 24 | [`numbered-section-labels`](https://github.com/pbakaus/impeccable/blob/dad8dbb3aac21ad1fa236c110315ef4abece23e8/crates/foundation/src/registry.rs#L264) | "01 / 02 / 03" section indices | Skip | Editorial pattern; onboarding step numbers are meaningful. |
| 25 | [`em-dash-overuse`](https://github.com/pbakaus/impeccable/blob/dad8dbb3aac21ad1fa236c110315ef4abece23e8/crates/foundation/src/registry.rs#L274) | Em-dash saturation in body copy | Skip | Needs ≥ 8 dashes of prose; UI strings are too short. |
| 26 | [`marketing-buzzword`](https://github.com/pbakaus/impeccable/blob/dad8dbb3aac21ad1fa236c110315ef4abece23e8/crates/foundation/src/registry.rs#L284) | "streamline / empower / supercharge…" | Later | Joins only if an eval run shows generated copy doing it. |
| 27 | [`aphoristic-cadence`](https://github.com/pbakaus/impeccable/blob/dad8dbb3aac21ad1fa236c110315ef4abece23e8/crates/foundation/src/registry.rs#L294) | "X. No Y." cadence across sections | Skip | Needs marketing prose. |
| 28 | [`oversized-h1`](https://github.com/pbakaus/impeccable/blob/dad8dbb3aac21ad1fa236c110315ef4abece23e8/crates/foundation/src/registry.rs#L304) | Long headline at display size | Skip | The scale tops out at 32px; `type-on-scale` holds it. |
| 29 | [`extreme-negative-tracking`](https://github.com/pbakaus/impeccable/blob/dad8dbb3aac21ad1fa236c110315ef4abece23e8/crates/foundation/src/registry.rs#L314) | Destructively tight letter-spacing | Skip → gate 2 | Tracking comes from composite type tokens. |
| 30 | [`broken-image`](https://github.com/pbakaus/impeccable/blob/dad8dbb3aac21ad1fa236c110315ef4abece23e8/crates/foundation/src/registry.rs#L324) | `<img>` with empty or placeholder src | Skip | No raw `<img>` in screens. |
| 31 | [`script-error`](https://github.com/pbakaus/impeccable/blob/dad8dbb3aac21ad1fa236c110315ef4abece23e8/crates/foundation/src/registry.rs#L334) | Uncaught JS error on load | Keep → harness | Every Playwright run asserts no `pageerror` or console error. Not counted as a taste rule. |
| 32 | [`content-hidden-at-rest`](https://github.com/pbakaus/impeccable/blob/dad8dbb3aac21ad1fa236c110315ef4abece23e8/crates/foundation/src/registry.rs#L344) | Text stuck at opacity 0 or hidden after a reveal | **Keep** → `content-hidden-at-rest` | Motion is the signature; an animation that leaves content hidden is the motion failure that matters most. |
| 33 | [`edge-flush-cards`](https://github.com/pbakaus/impeccable/blob/dad8dbb3aac21ad1fa236c110315ef4abece23e8/crates/foundation/src/registry.rs#L354) | Cards flush to a horizontal scroller edge | Skip | No card carousels. |
| 34 | [`text-occlusion`](https://github.com/pbakaus/impeccable/blob/dad8dbb3aac21ad1fa236c110315ef4abece23e8/crates/foundation/src/registry.rs#L364) | Text painted under another element | Later | Real risk with sticky headers and columns, but expensive; joins on evidence from an eval run. |
| 35 | [`first-viewport-column-overflow`](https://github.com/pbakaus/impeccable/blob/dad8dbb3aac21ad1fa236c110315ef4abece23e8/crates/foundation/src/registry.rs#L374) | One column runs far past the fold | Skip | Landing-page "fold" concept. |
| 36 | [`gray-on-color`](https://github.com/pbakaus/impeccable/blob/dad8dbb3aac21ad1fa236c110315ef4abece23e8/crates/foundation/src/registry.rs#L384) | Gray text on a coloured background | **Keep** → `gray-on-color` | Muted text inside status-tinted tags and banners is likely. |
| 37 | [`low-contrast`](https://github.com/pbakaus/impeccable/blob/dad8dbb3aac21ad1fa236c110315ef4abece23e8/crates/foundation/src/registry.rs#L394) | Below WCAG AA contrast | Skip → gate 4 | axe `color-contrast` is Serious, so gate 4 already fails it. |
| 38 | [`line-length`](https://github.com/pbakaus/impeccable/blob/dad8dbb3aac21ad1fa236c110315ef4abece23e8/crates/foundation/src/registry.rs#L404) | Lines > ~80 characters | Skip | Little prose; notes fields get a `max-width` in the component. |
| 39 | [`cramped-padding`](https://github.com/pbakaus/impeccable/blob/dad8dbb3aac21ad1fa236c110315ef4abece23e8/crates/foundation/src/registry.rs#L414) | Text within 8px of its container edge | Skip | Admin density deliberately goes below 8px in cells; padding comes from density tokens (gate 2). |
| 40 | [`body-text-viewport-edge`](https://github.com/pbakaus/impeccable/blob/dad8dbb3aac21ad1fa236c110315ef4abece23e8/crates/foundation/src/registry.rs#L424) | Paragraphs touching the viewport edge | Skip | Page padding is owned by the density set. |
| 41 | [`tight-leading`](https://github.com/pbakaus/impeccable/blob/dad8dbb3aac21ad1fa236c110315ef4abece23e8/crates/foundation/src/registry.rs#L434) | Line-height < 1.3 | Skip → gate 2 | Line-height comes from composite type tokens. |
| 42 | [`skipped-heading`](https://github.com/pbakaus/impeccable/blob/dad8dbb3aac21ad1fa236c110315ef4abece23e8/crates/foundation/src/registry.rs#L444) | h1 → h3 with no h2 | **Keep** → `skipped-heading` | axe `heading-order` is only Moderate, so gate 4 won't fail it. |
| 43 | [`heading-rhythm`](https://github.com/pbakaus/impeccable/blob/dad8dbb3aac21ad1fa236c110315ef4abece23e8/crates/foundation/src/registry.rs#L454) | Space above a heading ≤ space below | Later | Overlaps the brief-conformance gate; joins on evidence from an eval run. |
| 44 | [`justified-text`](https://github.com/pbakaus/impeccable/blob/dad8dbb3aac21ad1fa236c110315ef4abece23e8/crates/foundation/src/registry.rs#L464) | Justified narrow text | Skip | Never produced. |
| 45 | [`straggler`](https://github.com/pbakaus/impeccable/blob/dad8dbb3aac21ad1fa236c110315ef4abece23e8/crates/foundation/src/registry.rs#L474) | Single-word last line in a paragraph | Skip | `text-wrap: pretty` in base CSS once. |
| 46 | [`unbalanced-heading`](https://github.com/pbakaus/impeccable/blob/dad8dbb3aac21ad1fa236c110315ef4abece23e8/crates/foundation/src/registry.rs#L484) | Wrapped heading with a short last line | Skip | `text-wrap: balance` in base CSS once. |
| 47 | [`tiny-text`](https://github.com/pbakaus/impeccable/blob/dad8dbb3aac21ad1fa236c110315ef4abece23e8/crates/foundation/src/registry.rs#L494) | Body text < 12px | Adapt → `type-on-scale` | Merged: the brief's scale starts at 12px. |
| 48 | [`undersized-ui-text`](https://github.com/pbakaus/impeccable/blob/dad8dbb3aac21ad1fa236c110315ef4abece23e8/crates/foundation/src/registry.rs#L504) | Functional UI text < 11px | Adapt → `type-on-scale` | Merged; like impeccable, "it's on the ramp" is no excuse, because the ramp itself is the check. |
| 49 | [`all-caps-body`](https://github.com/pbakaus/impeccable/blob/dad8dbb3aac21ad1fa236c110315ef4abece23e8/crates/foundation/src/registry.rs#L514) | ≥ 80 characters of uppercase | Adapt → `no-all-caps` | The brief bans caps outright, so any length counts. |
| 50 | [`wide-tracking`](https://github.com/pbakaus/impeccable/blob/dad8dbb3aac21ad1fa236c110315ef4abece23e8/crates/foundation/src/registry.rs#L524) | > 0.05em tracking on body | Skip → gate 2 | Tracking comes from composite type tokens. |
| 51 | [`text-overflow`](https://github.com/pbakaus/impeccable/blob/dad8dbb3aac21ad1fa236c110315ef4abece23e8/crates/foundation/src/registry.rs#L534) | Content spilling, clipped or colliding | **Keep** → `text-overflow` | The #1 dense-UI failure: long contractor names, IBANs, big amounts in fixed columns. |
| 52 | [`repeated-container-text`](https://github.com/pbakaus/impeccable/blob/dad8dbb3aac21ad1fa236c110315ef4abece23e8/crates/foundation/src/registry.rs#L544) | Same text ≥ 3× in one card | Later | Joins only if an eval run shows generated cards doing it. |
| 53 | [`clipped-overflow-container`](https://github.com/pbakaus/impeccable/blob/dad8dbb3aac21ad1fa236c110315ef4abece23e8/crates/foundation/src/registry.rs#L554) | Positioned child clipped by `overflow: hidden` | Skip | Low precision upstream; Radix portals menus out anyway. |
| 54 | [`design-system-font`](https://github.com/pbakaus/impeccable/blob/dad8dbb3aac21ad1fa236c110315ef4abece23e8/crates/foundation/src/registry.rs#L564) | Font not in the design system | Skip → gate 2 | That's token lint. |
| 55 | [`design-system-color`](https://github.com/pbakaus/impeccable/blob/dad8dbb3aac21ad1fa236c110315ef4abece23e8/crates/foundation/src/registry.rs#L574) | Colour off-palette | Skip → gate 2 | That's token lint. |
| 56 | [`design-system-radius`](https://github.com/pbakaus/impeccable/blob/dad8dbb3aac21ad1fa236c110315ef4abece23e8/crates/foundation/src/registry.rs#L584) | Radius off-scale | Skip → gate 2 | That's token lint. |
| 57 | [`design-system-font-size`](https://github.com/pbakaus/impeccable/blob/dad8dbb3aac21ad1fa236c110315ef4abece23e8/crates/foundation/src/registry.rs#L594) | Font size off the ramp | Skip → gate 2 | That's token lint. |
| 58 | [`gpt-thin-border-wide-shadow`](https://github.com/pbakaus/impeccable/blob/dad8dbb3aac21ad1fa236c110315ef4abece23e8/crates/foundation/src/registry.rs#L604) | Hairline border plus wide diffuse shadow on every card | Adapt → `edge-treatment` | Basis of the border-xor-shadow check. |
| 59 | [`repeating-stripes-gradient`](https://github.com/pbakaus/impeccable/blob/dad8dbb3aac21ad1fa236c110315ef4abece23e8/crates/foundation/src/registry.rs#L614) | Repeating-gradient stripes as decoration | Adapt → `gradient-as-decoration` | Merged. |
| 60 | [`codex-grid-background`](https://github.com/pbakaus/impeccable/blob/dad8dbb3aac21ad1fa236c110315ef4abece23e8/crates/foundation/src/registry.rs#L624) | Hairline-gradient grid background | Adapt → `gradient-as-decoration` | Merged. |
| 61 | [`theater-slop-phrase`](https://github.com/pbakaus/impeccable/blob/dad8dbb3aac21ad1fa236c110315ef4abece23e8/crates/foundation/src/registry.rs#L634) | "…is just theater" copy | Skip | Prose tic; no such copy in product UI. |
