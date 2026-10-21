---
name: build-component
description: Build one design-system component against the design brief, gated. Usage: /build-component <Component>
disable-model-invocation: true
---

<!-- PROTOTYPE (wayfinder ticket #13, branch prototype/build-component). The library lives in proto/ on this branch. -->

You are building **one** library component, `$ARGUMENTS`, for a design system whose taste is fixed in writing. You are a careful implementer of someone else's taste, not the designer: the brief already made the calls. Work unattended: when the sources leave something open, make the smallest call the brief supports and record it as a **gap** (step 7); the human reviews gaps afterwards.

**Precedence**, wherever sources disagree: `docs/design-brief.md` > `docs/adr/*` > `frontend-design`.

## 1. Load `frontend-design`

Invoke `frontend-design:frontend-design` with the Skill tool, now, before reading anything else. Then apply these overrides to it, which win over its text:

- Its **design plan** (4–6 hex palette, typefaces, layout concept) becomes the **component plan** in step 3. The palette and type already exist as tokens.
- Its **hero / memorable thing / aesthetic risk** belongs to the brief's signature, which is motion on generated screens. A library component is **quiet**: it spends no boldness of its own.
- Its **confirm with the client** becomes: record a gap and carry on.
- Keep everything else: the review against defaults, the clusters it calibrates against, the copy rules, the quality floor, the screenshot critique, the specificity warning.

## 2. Read the sources

Read in full: `docs/design-brief.md`, every file in `docs/adr/`, `GLOSSARY.md`, and `proto/src/tokens/tokens.css` (the **closed vocabulary**: a class compiles only if this file defines it). Read every existing component in `proto/src/components/` so this one matches their conventions.

## 3. Write the component plan

Write `proto/src/components/$ARGUMENTS/PLAN.md`, under a page:

- **Use**: the one-line registry `use` description: when a screen reaches for this component, and when it reaches for a sibling instead.
- **Anatomy**: the slots, and the Radix primitive and parts, if any.
- **Variants, sizes, states**: each with its reason in the brief. Fewer is better; every variant is a choice a generated screen can get wrong.
- **Token map**: per slot and state, the exact token classes. Existing tokens only.
- **A11y contract**: role, accessible name, keyboard behaviour, focus (`:focus-visible` only), disabled and busy semantics, target size per density.
- **Motion**: which user action fires which `duration-*` / `ease-*`, and what reduced motion does instead.
- **Against defaults**: describe the shadcn/default version of this component in two lines, then each way this one differs and which brief line demands it. Where yours matches the default and the brief is silent, say so.

The plan is done when every variant and state has a token map and a brief line behind it.

## 4. Build

In `proto/src/components/$ARGUMENTS/`:

- **`$ARGUMENTS.tsx`**: one `tv()` from `tailwind-variants/lite`, a slot per part. Props come from the registry entry (`z.infer`), extended only with React's own (`children`, event handlers, `ref`). The component takes no `className` and no `style`.
- **`$ARGUMENTS.registry.ts`**: the Zod-first registry entry (ADR 0004): `name`, `use`, `slots`, and a `props` schema whose variant enums are read from the `tv()` config (`z.enum(Object.keys(x.variants.<v>))`), so the two can't drift.
- **`$ARGUMENTS.stories.tsx`**: `title: "Components/$ARGUMENTS"`; one story per variant, plus one per non-default state (disabled, busy, with icon…), with real product copy from the brief's domain (contractor invoices and payments), written to the brief's copy rules.
- Export it from `proto/src/index.ts`.

## 5. Gate loop

From `proto/`, run `pnpm gate $ARGUMENTS`. It runs gate 2 and static taste rules (ESLint), gate 3 (tsc), then gates 4, 6 and render-time 7 (Playwright over every story in light/dark × admin/contractor), and prints every failure.

Fix each failure **at its cause in the component**. The lint config, gate scripts, `tokens.css` and existing baselines are the standard, not the work: they stay untouched. First runs write new visual baselines; that is expected.

The loop is done when `pnpm gate $ARGUMENTS` prints PASS for every gate. After 5 failing runs, stop and report the remaining failures as they stand.

## 6. Critique the screenshots

Open every PNG in `proto/gates-out/shots/` for this component with the Read tool. Judge them against the brief's personality (warm, assured, plain-spoken), the density table, the radius table and the banned list, and against `frontend-design`'s default clusters. Then apply its mirror rule: remove one accessory.

If you change anything, go back to step 5. The critique is done when a full pass over the screenshots produces no change.

## 7. Report

Write `proto/src/components/$ARGUMENTS/GAPS.md`: every place the brief, ADRs or tokens didn't decide something you needed (a missing token, an unstated state, a conflict between sources), the call you made, and the alternative a human might prefer. A gap is never resolved by editing tokens or the brief.

End with a short summary: gate results, number of gate runs, what the critique changed, and the gaps.
