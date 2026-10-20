# Research: impeccable's detector rules, filtered for a dense B2B product UI

Resolves #6. Feeds #14 (taste lint rule selection, demo brief §9 Q9). Reference only: no dependency on impeccable, no code copied.

## Source

- Repo: [pbakaus/impeccable](https://github.com/pbakaus/impeccable), Apache 2.0 ([LICENSE](https://github.com/pbakaus/impeccable/blob/dad8dbb3aac21ad1fa236c110315ef4abece23e8/LICENSE)), read at commit `dad8dbb3aac21ad1fa236c110315ef4abece23e8` (HEAD of the default branch on 2026-10-21).
- Rule registry: [`crates/foundation/src/registry.rs`](https://github.com/pbakaus/impeccable/blob/dad8dbb3aac21ad1fa236c110315ef4abece23e8/crates/foundation/src/registry.rs#L32), the `ANTIPATTERNS` array. Its header says it ports the former JS registry `cli/engine/registry/antipatterns.mjs`, so the detector is now written in Rust.
- Read as data only: downloaded with `gh api .../tarball`, nothing was built or run.

Below, `[registry]` means that rule's entry in `registry.rs` (linked from each rule id in the table). The detection logic lives in:

- `crates/detect/src/regex_matchers.rs`: source-file regex.
- `crates/html/`: static HTML with a cascade.
- `crates/core/src/browser/`: a headless browser over CDP, using computed styles and boxes.

## Rule count: exactly 61

`ANTIPATTERNS` has **61** built-in rules, which matches the brief. The registry's own test asserts `ANTIPATTERNS.len() == 61` ([registry.rs#L842](https://github.com/pbakaus/impeccable/blob/dad8dbb3aac21ad1fa236c110315ef4abece23e8/crates/foundation/src/registry.rs#L842)). They fall into two categories: `slop` (31, AI tells) and `quality` (30, objective defects). 15 have severity `advisory`, 2 are `error`, and the rest default to `warning`.

The same test records two rules that were retired, so they are not part of the 61:

- `image-hover-transform`.
- `layout-transition`, retired on 2026-10-07 because "not one of its findings had been harmful" ([#L864-L869](https://github.com/pbakaus/impeccable/blob/dad8dbb3aac21ad1fa236c110315ef4abece23e8/crates/foundation/src/registry.rs#L864-L869)).

The test also notes that `bounce-easing` was demoted to advisory: "the measurement is right, the finding is almost never harmful" ([#L851-L855](https://github.com/pbakaus/impeccable/blob/dad8dbb3aac21ad1fa236c110315ef4abece23e8/crates/foundation/src/registry.rs#L851-L855)).

## Our context and how to read the table

- **Context.** Generated screens use only registry components and tokens (brief §2–3). Gate 2 (token lint) already bans raw colour, spacing, radius and font values. Gate 4 (axe-core) hard-fails serious and critical issues. Many impeccable rules exist because arbitrary HTML can do anything. Ours can't, so those rules either collapse into a check on the token or component definition (done once) or drop out.
- **Decision.** **Keep** means reimplement as is. **Adapt** means reimplement with a changed scope or threshold, or merged into another rule. **Skip** means don't implement. "→ gate N" means another gate already owns it.
- **Check.** **Static** means ESLint on TSX/CSS, or a check on the token JSON. **Render** means Playwright on a rendered story or screen (computed styles, bounding boxes, DOM order). **Both** means a cheap static approximation plus a render-time check that settles it.

## All 61 rules

| # | Rule (impeccable id) | What it detects | Decision | Reason for a dense B2B product UI | Check |
|---|---|---|---|---|---|
| 1 | [`side-tab`](https://github.com/pbakaus/impeccable/blob/dad8dbb3aac21ad1fa236c110315ef4abece23e8/crates/foundation/src/registry.rs#L34) | Thick coloured border on one side of a card | Adapt | A left status stripe on overdue rows or cards is a real temptation in invoicing. Fold into `edge-treatment`. | Static |
| 2 | [`border-accent-on-rounded`](https://github.com/pbakaus/impeccable/blob/dad8dbb3aac21ad1fa236c110315ef4abece23e8/crates/foundation/src/registry.rs#L44) | Thick accent border on a rounded element | Skip | Covered by `side-tab`/`edge-treatment`. Radius is token-owned. | Static |
| 3 | [`overused-font`](https://github.com/pbakaus/impeccable/blob/dad8dbb3aac21ad1fa236c110315ef4abece23e8/crates/foundation/src/registry.rs#L54) | Inter, Roboto, Geist, Fraunces, Plus Jakarta Sans, Space Grotesk | Adapt | The brief bans these. Check once on the font tokens. Gate 2 stops anything off-token. | Static (tokens) |
| 4 | [`flat-type-hierarchy`](https://github.com/pbakaus/impeccable/blob/dad8dbb3aac21ad1fa236c110315ef4abece23e8/crates/foundation/src/registry.rs#L64) | Heading/body size steps < 1.25× | Adapt | Dense UIs use tighter scales (1.125–1.2). Validate the type-scale tokens against the brief's ratio, not 1.25. | Static (tokens) |
| 5 | [`gradient-text`](https://github.com/pbakaus/impeccable/blob/dad8dbb3aac21ad1fa236c110315ef4abece23e8/crates/foundation/src/registry.rs#L74) | `background-clip: text` gradients | Adapt | Merge into `gradient-as-decoration`. | Static |
| 6 | [`ai-color-palette`](https://github.com/pbakaus/impeccable/blob/dad8dbb3aac21ad1fa236c110315ef4abece23e8/crates/foundation/src/registry.rs#L84) | Purple/violet gradients, cyan on dark | Skip | The palette is decided once in the brief and tokens. The gradient part is covered by `gradient-as-decoration`. | Render |
| 7 | [`cream-palette`](https://github.com/pbakaus/impeccable/blob/dad8dbb3aac21ad1fa236c110315ef4abece23e8/crates/foundation/src/registry.rs#L94) | Cream/beige page background | Skip | Palette choice is a brief decision, not lintable drift. | Render |
| 8 | [`nested-cards`](https://github.com/pbakaus/impeccable/blob/dad8dbb3aac21ad1fa236c110315ef4abece23e8/crates/foundation/src/registry.rs#L104) | Card inside card | **Keep** | Brief candidate. Detail screens (invoice detail, payment-status card) invite it. | Both (JSX `<Card>` in `<Card>`, plus painted card-in-card) |
| 9 | [`monotonous-spacing`](https://github.com/pbakaus/impeccable/blob/dad8dbb3aac21ad1fa236c110315ef4abece23e8/crates/foundation/src/registry.rs#L114) | One spacing value everywhere | Skip | Dense UIs legitimately repeat one step. Rhythm is judged by gate 5. | Static |
| 10 | [`bounce-easing`](https://github.com/pbakaus/impeccable/blob/dad8dbb3aac21ad1fa236c110315ef4abece23e8/crates/foundation/src/registry.rs#L124) | Bounce/elastic easing (`cubic-bezier` y outside 0–1) | **Keep** (promote to error) | Brief candidate. Motion is first-class, and overshoot is off-brand. Check the motion tokens too. | Static |
| 11 | [`pulsing-dot`](https://github.com/pbakaus/impeccable/blob/dad8dbb3aac21ad1fa236c110315ef4abece23e8/crates/foundation/src/registry.rs#L134) | Small pulsing status dot | Adapt | Payment statuses are not live data. Ban `pulse`/`ping` animations outside Skeleton. Candidate if the motion budget allows. | Static |
| 12 | [`blinking-cursor`](https://github.com/pbakaus/impeccable/blob/dad8dbb3aac21ad1fa236c110315ef4abece23e8/crates/foundation/src/registry.rs#L144) | Fake typing cursor in a hero | Skip | Landing-page pattern. No heroes. | Render |
| 13 | [`shape-assembled-illustration`](https://github.com/pbakaus/impeccable/blob/dad8dbb3aac21ad1fa236c110315ef4abece23e8/crates/foundation/src/registry.rs#L154) | Large inline SVG built from primitive shapes | Skip | No illustration in scope. Icons come from the library. | Static |
| 14 | [`organic-clip-path`](https://github.com/pbakaus/impeccable/blob/dad8dbb3aac21ad1fa236c110315ef4abece23e8/crates/foundation/src/registry.rs#L164) | Blob/torn-edge `clip-path` | Skip | Not a product-UI pattern. | Static |
| 15 | [`buried-raster`](https://github.com/pbakaus/impeccable/blob/dad8dbb3aac21ad1fa236c110315ef4abece23e8/crates/foundation/src/registry.rs#L174) | Image hidden under an opaque wash or near-zero opacity | Skip | No raster imagery in scope. | Render |
| 16 | [`dark-glow`](https://github.com/pbakaus/impeccable/blob/dad8dbb3aac21ad1fa236c110315ef4abece23e8/crates/foundation/src/registry.rs#L184) | Coloured glow shadows | Adapt | Merge into `edge-treatment`: elevation tokens must be neutral and offset. Raw shadows are already a gate-2 fail. | Static (tokens) |
| 17 | [`radial-halo`](https://github.com/pbakaus/impeccable/blob/dad8dbb3aac21ad1fa236c110315ef4abece23e8/crates/foundation/src/registry.rs#L194) | Saturated radial-gradient background glow | Adapt | Merge into `gradient-as-decoration`. | Static |
| 18 | [`radial-spotlight-glow`](https://github.com/pbakaus/impeccable/blob/dad8dbb3aac21ad1fa236c110315ef4abece23e8/crates/foundation/src/registry.rs#L204) | Translucent accent radial "spotlight" | Adapt | Merge into `gradient-as-decoration`. | Static |
| 19 | [`marquee`](https://github.com/pbakaus/impeccable/blob/dad8dbb3aac21ad1fa236c110315ef4abece23e8/crates/foundation/src/registry.rs#L214) | Auto-scrolling content | Skip | Never produced from our registry. Nothing to catch. | Render |
| 20 | [`icon-tile-stack`](https://github.com/pbakaus/impeccable/blob/dad8dbb3aac21ad1fa236c110315ef4abece23e8/crates/foundation/src/registry.rs#L224) | Rounded icon tile above a heading | Skip | Only EmptyState could do this. It is library-owned composition, reviewed once at component level. | Render |
| 21 | [`italic-serif-display`](https://github.com/pbakaus/impeccable/blob/dad8dbb3aac21ad1fa236c110315ef4abece23e8/crates/foundation/src/registry.rs#L234) | Oversized italic serif hero headline | Skip | No display/hero type in a product UI. | Render |
| 22 | [`hero-eyebrow-chip`](https://github.com/pbakaus/impeccable/blob/dad8dbb3aac21ad1fa236c110315ef4abece23e8/crates/foundation/src/registry.rs#L244) | Uppercase eyebrow or pill above a hero H1 | Skip | No heroes. | Render |
| 23 | [`kicker-above-heading`](https://github.com/pbakaus/impeccable/blob/dad8dbb3aac21ad1fa236c110315ef4abece23e8/crates/foundation/src/registry.rs#L254) | Tiny tracked label above any heading | Skip | PageHeader composition is library-owned. Breadcrumbs and record IDs above titles are legitimate in B2B. | Render |
| 24 | [`numbered-section-labels`](https://github.com/pbakaus/impeccable/blob/dad8dbb3aac21ad1fa236c110315ef4abece23e8/crates/foundation/src/registry.rs#L264) | "01 / 02 / 03" section indices | Skip | Editorial pattern. Onboarding-checklist step numbers are meaningful. | Render |
| 25 | [`em-dash-overuse`](https://github.com/pbakaus/impeccable/blob/dad8dbb3aac21ad1fa236c110315ef4abece23e8/crates/foundation/src/registry.rs#L274) | Em-dash saturation in body copy | Skip | Needs ≥ 8 dashes of prose. UI strings are too short. | Static |
| 26 | [`marketing-buzzword`](https://github.com/pbakaus/impeccable/blob/dad8dbb3aac21ad1fa236c110315ef4abece23e8/crates/foundation/src/registry.rs#L284) | "streamline / empower / supercharge…" | Adapt | Cheap regex on JSX string literals. Catches empty-state copy like "Streamline your payroll". Optional, not on the shortlist. | Static |
| 27 | [`aphoristic-cadence`](https://github.com/pbakaus/impeccable/blob/dad8dbb3aac21ad1fa236c110315ef4abece23e8/crates/foundation/src/registry.rs#L294) | "X. No Y." cadence across ≥ 3 sections | Skip | Needs marketing prose. | Static |
| 28 | [`oversized-h1`](https://github.com/pbakaus/impeccable/blob/dad8dbb3aac21ad1fa236c110315ef4abece23e8/crates/foundation/src/registry.rs#L304) | Long headline at display size | Skip | The type scale caps heading size. No display step. | Render |
| 29 | [`extreme-negative-tracking`](https://github.com/pbakaus/impeccable/blob/dad8dbb3aac21ad1fa236c110315ef4abece23e8/crates/foundation/src/registry.rs#L314) | Destructively tight letter-spacing | Skip → gate 2 | Letter-spacing comes from type tokens. Raw values are a gate-2 fail. | Static |
| 30 | [`broken-image`](https://github.com/pbakaus/impeccable/blob/dad8dbb3aac21ad1fa236c110315ef4abece23e8/crates/foundation/src/registry.rs#L324) | `<img>` with empty or placeholder src | Skip | No raw `<img>` in screens. Avatars are a component. | Static |
| 31 | [`script-error`](https://github.com/pbakaus/impeccable/blob/dad8dbb3aac21ad1fa236c110315ef4abece23e8/crates/foundation/src/registry.rs#L334) | Uncaught JS error on load | Keep (harness) | Assert no `pageerror`/console error in every Playwright run. Belongs in the harness, not counted as a taste rule. | Render |
| 32 | [`content-hidden-at-rest`](https://github.com/pbakaus/impeccable/blob/dad8dbb3aac21ad1fa236c110315ef4abece23e8/crates/foundation/src/registry.rs#L344) | Text stuck at opacity 0 / hidden after reveals | **Keep** | Motion is first-class. An entrance animation that gates content is the motion failure that matters most. | Render |
| 33 | [`edge-flush-cards`](https://github.com/pbakaus/impeccable/blob/dad8dbb3aac21ad1fa236c110315ef4abece23e8/crates/foundation/src/registry.rs#L354) | Cards flush to a horizontal scroller edge | Skip | No horizontal card carousels. | Render |
| 34 | [`text-occlusion`](https://github.com/pbakaus/impeccable/blob/dad8dbb3aac21ad1fa236c110315ef4abece23e8/crates/foundation/src/registry.rs#L364) | Text painted under another element | Adapt | Real risk with sticky table headers and columns. Heavier to build than `text-overflow`, so it follows later. | Render |
| 35 | [`first-viewport-column-overflow`](https://github.com/pbakaus/impeccable/blob/dad8dbb3aac21ad1fa236c110315ef4abece23e8/crates/foundation/src/registry.rs#L374) | One column runs far past the fold | Skip | Landing-page "fold" concept. | Render |
| 36 | [`gray-on-color`](https://github.com/pbakaus/impeccable/blob/dad8dbb3aac21ad1fa236c110315ef4abece23e8/crates/foundation/src/registry.rs#L384) | Gray text on a coloured background | **Keep** | Brief candidate. Muted text inside status-tinted banners and pills is likely. | Both (muted-text token on non-neutral surface token; computed colours) |
| 37 | [`low-contrast`](https://github.com/pbakaus/impeccable/blob/dad8dbb3aac21ad1fa236c110315ef4abece23e8/crates/foundation/src/registry.rs#L394) | Below WCAG AA contrast | Skip → gate 4 | axe `color-contrast` is Serious, so gate 4 already hard-fails it. | Render |
| 38 | [`line-length`](https://github.com/pbakaus/impeccable/blob/dad8dbb3aac21ad1fa236c110315ef4abece23e8/crates/foundation/src/registry.rs#L404) | Lines > ~80 characters | Skip | Few prose blocks. Tables don't wrap. Notes fields can get `max-width: 70ch` in the component. | Render |
| 39 | [`cramped-padding`](https://github.com/pbakaus/impeccable/blob/dad8dbb3aac21ad1fa236c110315ef4abece23e8/crates/foundation/src/registry.rs#L414) | Text too close to its container edge (≥ 8px expected) | Adapt | Density deliberately goes below 8px in table cells. If kept, the floor is the smallest spacing token, not 8px. | Render |
| 40 | [`body-text-viewport-edge`](https://github.com/pbakaus/impeccable/blob/dad8dbb3aac21ad1fa236c110315ef4abece23e8/crates/foundation/src/registry.rs#L424) | Paragraphs touching the viewport edge | Skip | Page gutters are owned by layout primitives. | Render |
| 41 | [`tight-leading`](https://github.com/pbakaus/impeccable/blob/dad8dbb3aac21ad1fa236c110315ef4abece23e8/crates/foundation/src/registry.rs#L434) | Line-height < 1.3 | Adapt | Single-line table cells legitimately use ~1.2–1.3. Check only multi-line roles in the type tokens. | Static (tokens) |
| 42 | [`skipped-heading`](https://github.com/pbakaus/impeccable/blob/dad8dbb3aac21ad1fa236c110315ef4abece23e8/crates/foundation/src/registry.rs#L444) | h1 → h3 with no h2 | **Keep** | Brief candidate. axe `heading-order` is only *Moderate*/best-practice, so gate 4 won't fail it. | Render (composed components own their heading levels) |
| 43 | [`heading-rhythm`](https://github.com/pbakaus/impeccable/blob/dad8dbb3aac21ad1fa236c110315ef4abece23e8/crates/foundation/src/registry.rs#L454) | Space above heading ≤ space below | Adapt | A good hierarchy signal for dense sectioned detail views. Overlaps gate 5, so it is later. | Render |
| 44 | [`justified-text`](https://github.com/pbakaus/impeccable/blob/dad8dbb3aac21ad1fa236c110315ef4abece23e8/crates/foundation/src/registry.rs#L464) | Justified narrow text | Skip | Never produced. Nothing to catch. | Static |
| 45 | [`straggler`](https://github.com/pbakaus/impeccable/blob/dad8dbb3aac21ad1fa236c110315ef4abece23e8/crates/foundation/src/registry.rs#L474) | Single-word last line in a paragraph | Skip | Advisory, prose-only. Set `text-wrap: pretty` in base CSS once. | Render |
| 46 | [`unbalanced-heading`](https://github.com/pbakaus/impeccable/blob/dad8dbb3aac21ad1fa236c110315ef4abece23e8/crates/foundation/src/registry.rs#L484) | Wrapped heading with a short last line | Skip | Advisory. Set `text-wrap: balance` in base CSS once. | Render |
| 47 | [`tiny-text`](https://github.com/pbakaus/impeccable/blob/dad8dbb3aac21ad1fa236c110315ef4abece23e8/crates/foundation/src/registry.rs#L494) | Body text < 12px | Adapt | Merge into `type-floor`. Density tempts 11px. | Render |
| 48 | [`undersized-ui-text`](https://github.com/pbakaus/impeccable/blob/dad8dbb3aac21ad1fa236c110315ef4abece23e8/crates/foundation/src/registry.rs#L504) | Functional UI text < 11px | Adapt | Merge into `type-floor`. It explicitly refuses the "it's on the ramp" excuse, which is right for us too. | Both |
| 49 | [`all-caps-body`](https://github.com/pbakaus/impeccable/blob/dad8dbb3aac21ad1fa236c110315ef4abece23e8/crates/foundation/src/registry.rs#L514) | ≥ 80 chars of uppercase | Skip | Uppercase only appears in short labels via tokens. | Render |
| 50 | [`wide-tracking`](https://github.com/pbakaus/impeccable/blob/dad8dbb3aac21ad1fa236c110315ef4abece23e8/crates/foundation/src/registry.rs#L524) | > 0.05em tracking on body | Skip → gate 2 | Tracking comes from type tokens. | Static |
| 51 | [`text-overflow`](https://github.com/pbakaus/impeccable/blob/dad8dbb3aac21ad1fa236c110315ef4abece23e8/crates/foundation/src/registry.rs#L534) | Content spilling and clipped or colliding | **Keep** | The #1 dense-UI failure: long contractor names, IBANs, big amounts in fixed columns. | Render |
| 52 | [`repeated-container-text`](https://github.com/pbakaus/impeccable/blob/dad8dbb3aac21ad1fa236c110315ef4abece23e8/crates/foundation/src/registry.rs#L544) | Same text ≥ 3× in one card | Adapt | Generated cards say "Overdue" in title, pill and tooltip. Cheap DOM check. Later. | Render |
| 53 | [`clipped-overflow-container`](https://github.com/pbakaus/impeccable/blob/dad8dbb3aac21ad1fa236c110315ef4abece23e8/crates/foundation/src/registry.rs#L554) | Positioned child clipped by `overflow: hidden` | Skip | Impeccable's own note: 0.08 precision. Radix portals menus out anyway. | Render |
| 54 | [`design-system-font`](https://github.com/pbakaus/impeccable/blob/dad8dbb3aac21ad1fa236c110315ef4abece23e8/crates/foundation/src/registry.rs#L564) | Font not in DESIGN.md | Skip → gate 2 | That's the token lint. | Static |
| 55 | [`design-system-color`](https://github.com/pbakaus/impeccable/blob/dad8dbb3aac21ad1fa236c110315ef4abece23e8/crates/foundation/src/registry.rs#L574) | Colour off-palette | Skip → gate 2 | That's the token lint. | Static |
| 56 | [`design-system-radius`](https://github.com/pbakaus/impeccable/blob/dad8dbb3aac21ad1fa236c110315ef4abece23e8/crates/foundation/src/registry.rs#L584) | Radius off-scale | Skip → gate 2 | That's the token lint. | Static |
| 57 | [`design-system-font-size`](https://github.com/pbakaus/impeccable/blob/dad8dbb3aac21ad1fa236c110315ef4abece23e8/crates/foundation/src/registry.rs#L594) | Font size off the ramp | Skip → gate 2 | That's the token lint. | Static |
| 58 | [`gpt-thin-border-wide-shadow`](https://github.com/pbakaus/impeccable/blob/dad8dbb3aac21ad1fa236c110315ef4abece23e8/crates/foundation/src/registry.rs#L604) | Hairline border plus wide diffuse shadow on every card | Adapt | Basis of `edge-treatment` (one edge per surface: border *or* elevation). | Static |
| 59 | [`repeating-stripes-gradient`](https://github.com/pbakaus/impeccable/blob/dad8dbb3aac21ad1fa236c110315ef4abece23e8/crates/foundation/src/registry.rs#L614) | Repeating-gradient stripes as decoration | Adapt | Merge into `gradient-as-decoration`. | Static |
| 60 | [`codex-grid-background`](https://github.com/pbakaus/impeccable/blob/dad8dbb3aac21ad1fa236c110315ef4abece23e8/crates/foundation/src/registry.rs#L624) | Hairline-gradient grid background | Adapt | Merge into `gradient-as-decoration`. | Static |
| 61 | [`theater-slop-phrase`](https://github.com/pbakaus/impeccable/blob/dad8dbb3aac21ad1fa236c110315ef4abece23e8/crates/foundation/src/registry.rs#L634) | "…is just theater" copy | Skip | Prose tic. No such copy in product UI. | Static |

**Tally.**

| Decision | Count | Rules |
|---|---|---|
| Keep | 7 | nested-cards, bounce-easing, script-error (harness), content-hidden-at-rest, gray-on-color, skipped-heading, text-overflow |
| Adapt | 19 | Many merged into 3 umbrella rules (`gradient-as-decoration`, `edge-treatment`, `type-floor`) or moved onto tokens |
| Skip | 35 | 7 of them are owned by gate 2 or 4 |

Roughly 20 of the 61 are landing-page or marketing tells (heroes, eyebrows, glows, cadence) with nothing to catch in a registry-constrained product UI.

## Cross-check against the brief's §5 gate-7 candidates

| Brief candidate | Impeccable rule? | Note |
|---|---|---|
| Nested cards | Yes: `nested-cards` | Keep. |
| Pure black / pure gray text | **No detector rule.** It appears only as prose advice ("tinted grays", `reference/quieter.md`) | New rule. Check the text-colour tokens: no `#000`/chroma-0 neutrals for text. Static. |
| Gray text on coloured backgrounds | Yes: `gray-on-color` | Keep. |
| Bounce/elastic easing | Yes: `bounce-easing` (advisory upstream) | Keep as error. The brief is stricter than impeccable's corpus. |
| Touch targets under 44px | **No detector rule.** It appears only as audit prose (`reference/audit.md`, `adapt.md`) | **Conflicts with density.** 44px is WCAG 2.5.5 (AAA). WCAG 2.2 AA (2.5.8) is 24×24px, and axe-core's `target-size` rule (Serious, tag `wcag22aa`, [axe rule list](https://github.com/dequelabs/axe-core/blob/develop/doc/rule-descriptions.md)) enforces that. Recommend delegating to gate 4 with `wcag22aa` enabled, plus 44px only under `pointer: coarse`. Human decision in #14. |
| Skipped heading levels | Yes: `skipped-heading` | Keep. Not redundant with gate 4 (axe `heading-order` is Moderate). |
| Gradient as decoration | Partly: `gradient-text`, `radial-halo`, `radial-spotlight-glow`, `repeating-stripes-gradient`, `codex-grid-background`, the gradient half of `ai-color-palette` | Merge into one rule: no `*-gradient()`/`bg-gradient-*` outside the token file. |
| Shadow as border | **No.** Nearest is `gpt-thin-border-wide-shadow` | Merge into `edge-treatment`: no spread-only `0 0 0 1px` shadows standing in for borders, border xor elevation per surface, neutral elevation only (absorbs `dark-glow`, `side-tab`). |
| More than two type weights on screen | **No** | New rule (type). Render-time count of distinct computed `font-weight` across visible text. |
| Off-scale spacing values | **No.** The `design-system-*` family covers colour, radius, font and font-size, not spacing | Belongs to gate 2 (token lint), not taste lint. |
| Transitions without motion tokens | **No.** `layout-transition` was retired upstream on 2026-10-07 | New rule (motion). Static. |

So only 4 of the 11 candidates map one-to-one onto impeccable. 2 map partially and 5 have no detector rule at all. Taken together, the brief's list already "goes beyond impeccable" as §3 requires.

## Rules impeccable lacks that this brief demands

1. **`motion-reduced`** (motion, Render).
   - Run each story or screen under Playwright `emulateMedia({ reducedMotion: 'reduce' })`.
   - Assert that every running animation or transition has computed duration ≤ the "instant" motion token, or animates only opacity.
   - Impeccable only *strips* reduced-motion blocks while scanning (`crates/core/src/checks/css_scan.rs`). It never checks that one exists.
   - A first-class motion system has to prove it degrades.
2. **`motion-token-only`** (motion, Static).
   - Every `transition`/`animation` duration and easing must reference a motion token.
   - Ban `transition: all`.
   - Animate only `transform`/`opacity` (plus colour for state changes) so the "visibly above baseline" transitions stay compositor-only.
   - This also covers the brief's "transitions without motion tokens".
3. **`tabular-numerals`** (density/type, Render).
   - In DataTable cells and summary figures, text that parses as money, a quantity or a date must have `font-variant-numeric: tabular-nums` and end alignment in numeric columns.
   - This is the core legibility rule for a payroll/invoicing table and is absent from impeccable.
4. **`type-weight-budget`** (type, Render). The brief's "more than two type weights": at most N distinct computed weights per screen, with N from the design brief.

## Proposed shortlist (14 rules) — for ratification in #14

| # | Rule | Origin | Check | Covers brief candidate |
|---|---|---|---|---|
| 1 | `nested-cards` | impeccable (keep) | Both | nested cards |
| 2 | `gray-on-color` | impeccable (keep) | Both | gray on coloured bg |
| 3 | `no-pure-neutral-text` | brief (new) | Static (tokens + CSS) | pure black / pure gray |
| 4 | `gradient-as-decoration` | impeccable (adapt; merges 5 rules) | Static | gradient as decoration |
| 5 | `edge-treatment` | impeccable (adapt; `gpt-thin-border-wide-shadow` + `dark-glow` + `side-tab`) | Static | shadow as border |
| 6 | `bounce-easing` | impeccable (keep, as error) | Static | bounce/elastic |
| 7 | `motion-token-only` | new (motion) | Static | transitions without motion tokens |
| 8 | `motion-reduced` | new (motion) | Render | — |
| 9 | `content-hidden-at-rest` | impeccable (keep) | Render | — |
| 10 | `skipped-heading` | impeccable (keep) | Render | skipped headings |
| 11 | `type-floor` | impeccable (adapt; `tiny-text` + `undersized-ui-text`) | Both | — |
| 12 | `type-weight-budget` | brief (new) | Render | > 2 weights |
| 13 | `tabular-numerals` | new (density/type) | Render | — |
| 14 | `text-overflow` | impeccable (keep) | Render | — |

The split is 6 static, 6 render and 2 both.

**Placed outside the taste lint deliberately:**

| Item | Where it goes | Note |
|---|---|---|
| Off-scale spacing and the `design-system-*` family | Gate 2 | — |
| `low-contrast` | Gate 4 | — |
| Touch targets | Gate 4 via axe `target-size` | Needs the human's call on 24px vs 44px |
| `script-error` | Playwright harness | Assertion on every run |

**Next in line if a slot opens:** `text-occlusion`, `repeated-container-text`, `pulsing-dot`, `marketing-buzzword`, `heading-rhythm`.

## Open points for #14

- Touch-target threshold: 24px (WCAG 2.2 AA, axe) vs 44px (the brief). This is a density trade-off only the human can make.
- Type-weight budget N and type-floor px depend on the design brief (#2).
- `bounce-easing` stays an error here even though upstream demoted it. Confirm.
