# Project brief: AI-assisted design system + generation pipeline

Input for `/wayfinder`. Decisions marked **DECIDED** are settled; don't reopen them. Items under _Open questions_ are the investigation tickets.

## 1. Why this exists

Portfolio demo for **AI Design Engineer**-type roles (design systems + AI tooling, usually sitting in a Product Design team). The common core of these postings: build the system that lets AI build products, with humans defining the taste, the guardrails, and the standards it works within. Hands-on design is often also required; I have none. The demo is honest about that: the design system itself is built _with_ Claude Code against a written design brief I own, then everything downstream (generation, gates, evals, Figma sync) is the system side at a level nobody else will bring.

Narrative: _"I'm not a designer. I've spent 15 years making designers' work ship at award level. This is that craft encoded into a system: a human-written brief, an AI-built design system, and the guardrails and evals that keep AI output production-ready."_

Audience: a product-design lead and an engineer at the hiring company, evaluating in ~10 minutes. The deliverables they'll touch, in order: Loom → README/case study → Storybook → repo.

Hard deadline: see _Scope and timebox_.

Tailoring per application (README/case study/Loom only; the system itself stays the same): role title, the posting's own phrasing of the core ask, who's evaluating, and why the screen domain is relevant to that company.

## 2. What it is

A pipeline where:

1. A one-page **design brief** (human-written: tone, density, type, colour logic, motion principles, references, banned defaults) is the source of taste.
2. Claude Code builds a small **design system** against that brief: tokens (JSON → CSS variables + TypeScript types), a hand-built React component library, Storybook. Every design decision is logged as an ADR, including the ones I'd hand to a real designer.
3. An agent takes a plain-language screen brief ("invoice list with filters, overdue state, bulk-pay action") and produces a screen using **only** library components and tokens, via a two-step spec → code pipeline.
4. Quality gates (registry, token lint, types, a11y, brief-conformance, visual regression) pass or fail the output; a repair loop feeds failures back to the agent.
5. An eval suite runs a fixed set of screen briefs across runs and reports pass rates.
6. Tokens, component frames and generated screens are pushed **into** Figma through Figma's official MCP server (write to canvas + code to canvas). Code is the source of truth; Figma is a shared surface, not an input.

Domain for the generated screens: **contractor payroll / invoicing** (I live it as a contractor; a domain I know beats one picked to flatter a company). Screens: invoice list, invoice detail, contractor onboarding checklist, payment-status card.

## 3. Decided

- **DECIDED** The design system is **built with Claude Code, not sourced from a kit**. Taste comes from a written design brief (`docs/design-brief.md`) that I author before any component exists. The brief is the spec the system is designed against and the thing the case study points to as "the human-defined part".
- **DECIDED** The design brief must explicitly **ban generic AI defaults**: no Inter/Geist, no Tailwind palette names as the palette, no shadcn silhouettes, no 8px-grid-indigo-button look. It names 2–3 reference products for _principles_ (density, hierarchy, restraint), never for pixels. Which references is an open question.
- **DECIDED** Motion is a first-class part of the system: duration/easing tokens, documented motion principles in the brief, and at least two transitions in generated screens that are visibly above baseline. This is where my actual strength shows.
- **DECIDED** Agent emits a **typed UI spec first** (Zod-validated JSON referencing the component registry), then a second step generates real React/TSX from the spec. Not a runtime JSON renderer — the output is production code. The spec step exists so the cheap gate (schema + registry validation) runs before any code is written.
- **DECIDED** **Figma Professional plan, one Full seat** (~$16/month) for the duration of the project. The project file lives in the Pro team, not in Drafts — limits follow the file's location, not the seat.
- **DECIDED** Figma integration is **write-first** and uses only **Figma's official remote MCP server** (`https://mcp.figma.com/mcp`, OAuth) from Claude Code. No custom plugin, no REST. Verified against Figma docs, Oct 2026:
  1. **Tokens + component frames → Figma: "Write to canvas" (`use_figma`)** — the agent runs Plugin API code in the file to create variable collections with modes, component frames with variants and auto layout, fills bound to variables. Pro+ feature, free during beta (will become usage-based). Driven by Figma's own `figma-use` skill.
  2. **Generated screens → Figma: "Code to canvas" (`generate_figma_design`)** — captures the running UI as editable layers into the project file. Exempt from rate limits. With the file's variables in place, captured layers auto-bind to matching variables.
     Reads are now possible (200 tool calls/day, 10/min on a Pro Full seat) but stay out of the loop: code is the source of truth. There is no verification read after a write: each write script returns its own counts and bindings, and a failed `use_figma` call rolls back ([ADR 0007](adr/0007-figma-sync-is-a-generated-one-call-script.md)).
- **DECIDED** Light/dark are real **variable modes** in Figma (Pro allows multiple modes per collection). Figma variables mirror the code tokens one-to-one, modes included.
- **DECIDED** Component library is hand-built, not MUI. Radix primitives + Tailwind v4 with a token-only theme; see [ADR 0002](adr/0002-token-only-tailwind-and-eslint-token-lint.md).
- **DECIDED** The **design system is built** by the pattern from `gianko/agent-quiz-app`: an unattended Claude Code build loop, spec-first, issue-tracked, one issue per iteration.
- **DECIDED** **Screens are generated** by a two-call workflow on the Messages API (`messages.parse` + Zod, `claude-opus-5-5`), not an agent loop: unattended and spec-first, but not issue-tracked. API key with a Console spend limit, not the subscription. See [ADR 0003](adr/0003-generator-on-messages-api-not-an-agent-loop.md).
- **DECIDED** No workbench UI, no backend service, no database, no conversational editing. CLI + Storybook + static eval report. If something needs persistence it's a JSON file in the repo.
- **DECIDED** Generative UI in-product (adaptive runtime interfaces) is **out of scope**. Deliberately. Mention in the case study as the obvious next step.
- **DECIDED** Repo conventions: written domain model, ADRs, spec-first, TypeScript strict, Vitest, Playwright, ESLint. Same as my other repos.
- **DECIDED** Deliverables: public GitHub repo, deployed Storybook, 3-minute Loom (design brief → Storybook → screen brief → generated screen → failing gate → repair → passing → screen appears in Figma), case study doc in the repo (`docs/case-study.md`) with a section titled "What a designer should change".
- **DECIDED** Anthropic's `frontend-design` skill is loaded for every session where Claude Code builds or modifies a component. It is the only third-party design skill in the loop. Its current bans are restated in the design brief so the brief stands on its own. Since its 2026-09-03 rewrite the skill bans typographic tells and default clusters rather than named fonts, so the design brief names the banned fonts (Inter, Geist, Roboto, Arial, Space Grotesk) itself.
- **DECIDED** No impeccable dependency. Its 61 detector rules are used as a **reference list only**: read them, pick the ones that apply to a dense B2B product UI, reimplement that subset in our own taste lint (gate 7), credit the source in the rule file. Rules we skip are listed with a one-line reason. Our rule set is small enough to read in one sitting and goes beyond impeccable in at least one direction the brief cares about (density, motion or type).

## 4. Components (initial list — trim, don't grow)

Button, IconButton, Input, Select, Checkbox, Badge/StatusTag, Card, DataTable (sortable, selectable rows), Pagination, Tabs, Modal/Sheet, Toast, EmptyState, PageHeader, Stack/Grid layout primitives, Heading, Text, Amount (typography; generated screens use library components only, see [ADR 0004](adr/0004-flat-library-only-ui-spec-and-zod-first-registry.md)).

Tokens: colour (semantic, light + dark modes), spacing, radius, type scale + pairing, elevation, motion (durations, easings), z-index.

## 5. Quality gates (priority order)

1. **Registry/schema gate** — spec references only registered components with valid props. Hard fail, pre-code.
2. **Token lint** — ESLint rule(s): no raw colour/spacing/radius/font values, no inline styles, no imports outside the library barrel. Hard fail.
3. **TypeScript + build** — hard fail.
4. **a11y** — axe-core via Playwright; serious/critical = hard fail.
5. **Brief conformance** — rendered screenshot judged against `docs/design-brief.md` (density, hierarchy, spacing rhythm, motion used where the brief says). Approach is an open question (vision-model judge with a rubric vs structural heuristics). Report, soft fail initially; promote to hard once the signal is trusted.
6. **Visual regression** — Playwright screenshots of library stories and kept screens, CI-gated. Fresh generated screens have no baseline, so a generated screen enters gate 6 only once it is kept ([ADR 0009](adr/0009-gates-render-in-one-pinned-linux-arm64-image.md)).
7. **Taste lint** — our own deterministic rules, `lint/taste/*.ts`, run via ESLint + a Playwright pass over rendered stories. Subset reimplemented from impeccable's detector (credited), plus brief-specific rules. Starting candidates: nested cards, pure black / pure gray text, gray text on coloured backgrounds, bounce/elastic easing, touch targets under 44px, skipped heading levels, gradient-as-decoration, shadow-as-border, more than two type weights on screen, off-scale spacing values, transitions without motion tokens. Hard fail on the design system; hard fail on generated screens once the system passes clean.

Repair loop: failures (gate name + message) go back to the agent with the original screen brief; max N attempts; log every attempt. **DECIDED** ([ADR 0010](adr/0010-each-generator-step-repairs-itself-from-normalised-gate-failures.md)): each step repairs only itself, 3 attempts each, with normalised, deduplicated failures from every gate that could run.

The same gates 2, 4, 6 and 7 run on the **design system itself** during its AI-assisted build, so the system is held to its own standard from day one.

## 6. Evals

- 15–20 screen briefs, fixed, in `evals/briefs/*.md`, with per-brief pass criteria (required components, required states, a11y, motion where expected).
- Runner executes each brief K times, records per-gate pass/fail, attempts-to-pass, tokens/cost, wall time.
- Output: `evals/results/<date>-<label>.json` (committed) + a self-contained HTML report, and a markdown table rendered into the README. Runner shape, budget and comparison: [ADR 0008](adr/0008-eval-runs-are-a-budgeted-script-compared-after-the-fact.md).
- Must be able to compare two prompt/registry versions side by side. This is the proof it's a repeatable system.

## 7. Figma sync (write only)

Order matters: variables first, then component frames, then screen captures, so everything downstream binds to the variables.

- **Tokens → variables (`use_figma`):** a repo skill/script hands the agent the token JSON; the agent creates/updates variable collections with light/dark modes. Re-running updates by stable name rather than duplicating. This is the sync we'd want to be idempotent and testable: a `figma:sync-tokens` command with a dry-run that prints the diff. **DECIDED** ([ADR 0007](adr/0007-figma-sync-is-a-generated-one-call-script.md)): a generated Plugin API script, passed verbatim to `use_figma` in one atomic call, checksummed; the skill only drives it.
- **Components → frames (`use_figma`):** one frame per library component with its main variants, auto layout, fills bound to variables. Thin is acceptable: correct tokens, names, hierarchy. "A designer can open it and comment" is the bar.
- **Generated screens → layers (`generate_figma_design`):** capture each generated screen (and its key states) from the local dev server into the project file. No code beyond the MCP config and the prompt/skill that runs it.
- **Verify after write:** no extra read. The write script returns its own evidence (created/updated/unchanged, orphans, bindings, values per mode), and a failed call rolls back. A capture can optionally be checked with a read-only `use_figma` walk of its bindings ([ADR 0007](adr/0007-figma-sync-is-a-generated-one-call-script.md)).
- Remote MCP server only; do not also configure the desktop server (`127.0.0.1:3845`) or the write/capture tools won't load.
- Everything runs from Claude Code; no Figma desktop dependency beyond having the file open to look at the result.

## 8. Scope and timebox

- Target: **3 weekends** of focused work, plus evenings for the design brief, case study and Loom.
- Order: design brief (evening, before anything else) → vertical slice: tokens + 4 components + one screen brief + gates 1–4 + taste lint (first 5 rules) + one Figma push → then widen.
- Fallback if time runs out (cut from the end): drop component frames → drop brief-conformance gate → ship as "AI-built design system + Design System Guardian" (token lint + a11y + evals on generated screens) and still have a coherent story.

Priority:

| P   | Deliverable                                                                                                                                                                   |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P0  | Design brief; tokens pipeline; component library + Storybook (AI-built, gated); spec→code agent; gates 1–4; repair loop; 5 screen briefs in evals; taste lint (first 5 rules) |
| P1  | Motion in generated screens; full brief set; eval comparison across versions; Figma: variables with modes + screen captures; taste lint complete                              |
| P2  | Brief-conformance gate; Figma: component frames; case study; Loom; deployed Storybook; README eval table auto-generated                                                       |

## 9. Open questions (investigation tickets)

1. **Design brief content** — the one page. Tone, density, type pairing (non-default, licensable, variable font preferred), colour logic (semantic roles, how light/dark derive), spacing rhythm, radius language, elevation, motion principles, banned defaults. Pick 2–3 reference products for principles. This ticket produces `docs/design-brief.md` and is the gate for everything else.
2. **DECIDED** ([ADR 0006](adr/0006-one-gated-build-component-session-per-component.md)): one headless `/build-component` session per component, `frontend-design` first, gates run by one `pnpm gate` command, no `/design`. **How Claude Code builds the system against the brief** — prompt/skill shape, one component per session vs batch, how the brief and ADRs get injected, how gates run inside the loop. `frontend-design` loaded for every component session. Is Claude Code's `/design` skill useful here or does it pull toward defaults?
3. **DECIDED** ([ADR 0007](adr/0007-figma-sync-is-a-generated-one-call-script.md)): the pipeline works end to end; local variables bind in captures, modes included; `figma:sync-tokens` is a generated one-call script. **Figma sync spike** — one evening, after the Pro seat is active and the project file is in the Pro team:
   a. Configure the remote Figma MCP server in Claude Code (OAuth), install Figma's `figma-use` skill, run `whoami` to confirm plan + seat.
   b. **`use_figma`:** create one variable collection with light/dark modes from a token JSON, then one component frame with two variants bound to those variables. Confirm idempotent re-run (update, not duplicate). Note how much Plugin API code the agent writes per call and the 20 KB output cap per call.
   c. **`generate_figma_design`:** capture one Storybook story into the same file. Confirm captured layers bind to the variables created in (b) — docs say "a library with variables"; check whether local variables in the same file count or whether the file must be published as a library (Pro can publish).
   d. Decide the shape of `figma:sync-tokens`: a Claude Code skill that drives `use_figma`, vs a generated Plugin API script the agent executes verbatim. Prefer whichever makes re-runs deterministic.
4. **DECIDED** ([ADR 0002](adr/0002-token-only-tailwind-and-eslint-token-lint.md)): Radix + Tailwind v4. **Radix+Tailwind v4 vs CSS modules** for the library. Criteria: how legibly the token constraints can be linted; how the agent's generated code reads; bundle/setup cost.
5. **DECIDED** ([ADR 0003](adr/0003-generator-on-messages-api-not-an-agent-loop.md)): Messages API, two calls, no agent loop. **Agent runtime:** Claude Agent SDK vs hand-rolled tool-calling loop vs reusing the agent-quiz-app Ralph loop as-is. Criteria: least code, structured output support for the spec step, ability to inject gate failures as follow-up turns.
6. **DECIDED** ([ADR 0004](adr/0004-flat-library-only-ui-spec-and-zod-first-registry.md)): a flat, library-only node list with layout, copy, bindings, screen states and actions; a Zod-first registry derived into the library's props. **Spec schema design** — shape of the typed UI spec (tree of registered components + props + slots + data bindings?). How much layout does the spec carry vs the code step? How does the registry get generated from the component library (from TS types? from Storybook metadata?) so it can't drift?
7. **Brief-conformance gate** — vision-model judge with a rubric derived from the brief vs structural heuristics (spacing values on the rhythm, type sizes on the scale, motion present). Which gives a useful, repeatable signal? Cost per run?
8. **DECIDED** ([ADR 0002](adr/0002-token-only-tailwind-and-eslint-token-lint.md)): ESLint only. **Token lint implementation** — custom ESLint rules vs Stylelint vs a Tailwind-class allowlist plugin. Must catch raw values in TSX, CSS, and Tailwind arbitrary values.
9. **DECIDED** ([`lint/taste/RULES.md`](../lint/taste/RULES.md)): 15 taste rules (5 kept from impeccable, 5 adapted, 5 new), the first 5 in P0; token-level checks move to the token build. **Taste lint rule selection** — read impeccable's 61 detector rules (github.com/pbakaus/impeccable, Apache 2.0). For each: keep / adapt / skip, with a reason. Target 10–15 rules. Decide what's checkable statically (ESLint on TSX/CSS) vs needs a render (Playwright: computed styles, bounding boxes, heading order). Add 2–3 rules impeccable doesn't have that the brief demands. Output: `lint/taste/RULES.md` with the kept/skipped table, then the implementations.
10. **DECIDED** ([ADR 0008](adr/0008-eval-runs-are-a-budgeted-script-compared-after-the-fact.md)): a standalone `pnpm eval` script with a dollar budget, compared after the fact from committed results files in an HTML report. **Eval runner shape** — reuse Vitest as the runner (each brief = a test, K reps) vs standalone script. Cost control: cap total runs per eval invocation.
11. **Case study outline** — what goes in, the eval table, which failures to show honestly, and the "What a designer should change" section.
12. **DECIDED** ([ADR 0009](adr/0009-gates-render-in-one-pinned-linux-arm64-image.md)): one GitHub Actions job on an arm64 runner runs the token build, Vitest and `pnpm gate`, with every screenshot rendered in one pinned Playwright image locally and in CI; Storybook and the newest eval report deploy to GitHub Pages; no secrets in CI. **CI** — GitHub Actions: lint + typecheck + unit + Storybook build + Playwright visual regression. Evals run manually (cost), results committed.

## 10. Non-goals

- Pretty product UI for the pipeline itself.
- Multi-agent orchestration.
- Reading from Figma. Figma is an output.
- Supporting more than one design system.
- Runtime generative UI.
- Pretending the design decisions are a designer's. The case study says which ones aren't.

## 11. Links

- Job posting: https://www.deel.com/careers/job/adaa0161-cd93-47d0-aaf3-bd6eabc61a6c/
- Anthropic `frontend-design` skill: https://github.com/anthropics/skills
- Impeccable detector rules (reference only, Apache 2.0): https://github.com/pbakaus/impeccable
- Figma MCP — Write to canvas: https://developers.figma.com/docs/figma-mcp-server/write-to-canvas/
- Figma MCP — Code to canvas: https://developers.figma.com/docs/figma-mcp-server/code-to-canvas/
- Figma skills (`figma-use`): https://help.figma.com/hc/en-us/articles/39166810751895
- Figma Plugin API (what `use_figma` executes): https://developers.figma.com/docs/plugins/
- Figma MCP — rate limits & access: https://developers.figma.com/docs/figma-mcp-server/rate-limits-access/
- Figma MCP — remote server setup: https://developers.figma.com/docs/figma-mcp-server/remote-server-installation/
