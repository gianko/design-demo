# Figma spike: findings

PROTOTYPE, throwaway. Answers wayfinder ticket [Figma spike: variables, a component frame, a capture, and the shape of figma:sync-tokens](https://github.com/gianko/design-demo/issues/15), run 2026-10-21 against [Dill Demo](https://www.figma.com/design/qgCHZ55XTiozWpZvASRzJE/Dill-Demo) on a Pro Full seat through the remote MCP.

**Question.** Does the Figma write pipeline work end to end, and what shape should `figma:sync-tokens` take?

**Verdict.** Yes, end to end. Tokens → variables and styles → a bound component set → a Storybook capture that binds back to those variables, with modes resolved. `figma:sync-tokens` should be a **generated, deterministic Plugin API script** that the agent passes verbatim to `use_figma` in **one call**, with a dry-run diff and a checksum guard. A thin Claude Code skill drives it, but the skill never writes Plugin API code itself.

## What's here

| File | Role |
| --- | --- |
| `payload.mjs` | Stand-in for the Figma output of `tokens/build.ts`: reads `src/tokens/tokens.css`, writes `out/payload.json` (sRGB 0–1, roles aliased to `Primitives`, gamut check) |
| `sync.mjs` | The `figma:sync-tokens` generator: payload → `out/{apply,dry-run}/01-all.js`, one script if it fits under `use_figma`'s 50,000-char `code` limit, else one per collection (`--split`) |
| `sync-runtime.js`, `styles-runtime.js` | The script bodies: upsert by stable name, report orphans, never delete |
| `button.js` | Button component set bound to the variables, plus a `Button / modes` frame pinning Color × Density |
| `../../.storybook/preview-head.html` | Capture script tag; inert without `#figmacapture=…` |

Run: `pnpm figma:payload && pnpm figma:sync [--dry-run]`, then paste `out/apply/01-all.js` into `use_figma` verbatim.

Figma nodes: Button set `8:6`, modes frame `8:7`, captures `11:14` (Primary, Light/Admin) and `13:14` (Secondary, Dark/Contractor).

## The research's twelve "spike must confirm" items

| # | Check | Result |
| --- | --- | --- |
| 1 | MCP captures bind to **local** variables | **Yes.** No library needed |
| 2 | Code-syntax format the matcher compares | `var(--ds-x)` matches. Figma names (`space/sm`) can't match `--ds-space-sm`, so the match is by code syntax |
| 3 | Mode of a dark capture | **Binds the same variables and sets explicit modes on the captured frames** (Color → Dark, Density → Contractor). No value-matching to light values |
| 4 | Does `use_figma` count toward 200/day? | **Unobservable**: no counter anywhere, `whoami` included. ~13 calls today, no limit hit. Moot: a sync is 1 call and verifies itself |
| 5 | Max script size / time | `code` maxLength is **50,000 chars** (tool schema). Full sync = 29.4K chars, 106 variables + 6 text + 2 effect styles **in one call**, no timeout. Figma's "20–30 variables per call" advice isn't needed at our size |
| 6 | 20 KB output cap on a full sync | Not hit: ~6 KB on a from-scratch run (names), ~2 KB on a no-op run (counts) |
| 7 | Text fields bindable through `use_figma` | **Yes**: `fontFamily`, `fontSize`, `lineHeight`, `fontWeight`, `letterSpacing` (px) on text styles. A style bound to `density/*` resolves per frame mode, so **one `body` style**, no two-style fallback |
| 8 | `TIMING` / `EASING` on Pro | **Yes.** Values: ms numbers; `CUSTOM_CUBIC_BEZIER`, overshoot (`y1 = 1.18`) kept. They **reject `scopes`** (throws). Captures don't bind them |
| 9 | Float round-trip | float32, error ~1e-7. Comparing at 1e-4 is safe |
| 10 | Storybook story capture | **Works, fully automatic**: script via `.storybook/preview-head.html`, open `iframe.html?id=<story>&viewMode=story&globals=theme:dark;density:contractor#figmacapture=…`, `figmaselector=%23storybook-root` crops to the story. No human click |
| 11 | `use_figma` input schema | `code` (≤ 50,000), `fileKey`, `description`, `sessionId` (from `create_session`), `skillNames` |
| 12 | `set.appendChild(component)` into an existing set | **Works.** Re-run added a third variant, kept the two existing IDs |

## Things nobody predicted

1. **A `use_figma` call is a transaction.** The first full sync threw on the motion variables' scopes after six collections had been written; nothing persisted, and the next run created everything from scratch. So one call = one atomic sync, which is the strongest argument for not chunking.
2. **The agent re-types the script.** `use_figma` takes code inline, not a file, so "verbatim" means the model reproduces ~29K chars. The generator embeds an FNV-1a checksum of the data; the script recomputes it and throws on mismatch, and (1) means a mismatch writes nothing. Cost is ~10K output tokens per sync.
3. **Idempotent and drift-aware.** After a hand edit (`space/sm` 16 → 18) and a stray `space/legacy`, the dry run reported exactly `space/sm (value:Value)` and one orphan, with 104 unchanged. Apply restored the value in place (same IDs) and left the orphan for an explicit prune.
4. **The gamut gate earns its keep on day one.** Three light status backgrounds in the hand-written stand-in tokens are outside sRGB: `awaiting` `oklch(0.95 0.06 85)`, `overdue` `oklch(0.95 0.035 25)`, `scheduled` `oklch(0.95 0.03 250)`. The spike clamps them; the real build must fail on them, and the real token values must fix them.
5. **Font weight binds to the wrong role in captures.** Tailwind emits weight through `--tw-font-weight`, so there's no `--ds-*` name to match, and the matcher falls back to value + scope and picks the first 600 (`type/figure/weight`). Per-role weight variables make that fallback ambiguous; two weight variables (`type/weight/regular`, `type/weight/semibold`) would make it exact.
6. **Every theme value must be a `--ds-*` variable for captures to bind it.** The stand-in `tokens.css` had spacing, radius, type and motion as literals inside `@theme inline`, which compile to bare px values with nothing to match. The spike moved them to `:root` `--ds-*` variables (ADR 0005's naming already implies this); `tokens/build.ts` must emit them that way.
7. **Captures bind variables, not text styles.** Text nodes come out with bound size, line height, family and weight, but no style. Fine for the demo.
8. **Shadows can't follow the theme.** Effect styles have no modes, and dark elevation in the brief is a ring, not a drop shadow. The sync writes light-theme effect styles only.
9. Expected misses: alpha colours never bind (primary's `border-transparent`, the scrim); `min-height` (`density/target`) didn't bind in the capture.

## "One verification read after a Figma write" (§3, §7)

Not needed. Every write script returns its own evidence (created/updated/unchanged counts, orphans, binding flags, resolved values per mode), and a failed write rolls back. A capture can be checked with a read-only `use_figma` walk of `boundVariables` (the `pins`/`bindings` returns above). Whether that walk counts against the read budget is unknown, but it's optional.
