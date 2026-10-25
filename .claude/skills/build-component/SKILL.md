---
name: build-component
description: Build one design-system component against the design brief, gated. Usage: /build-component <Component>
disable-model-invocation: true
---

You are building **one** library component, `$ARGUMENTS`, for a design system whose taste is fixed in writing. You are a careful implementer of someone else's taste, not the designer: the brief already made the calls. Work unattended: when the sources leave something open, make the smallest call the brief supports and record it as a **gap** (step 7); the human reviews gaps afterwards.

**Precedence**, wherever sources disagree: `docs/design-brief.md` > `docs/adr/*` > `frontend-design`.

**Working copy.** You start in a working copy of your own, on this component's own branch: it already meets `AGENTS.md` § Working copy, so build in it as it stands. Leave the work uncommitted: the build loop commits it and opens the PR.

## 1. Load `frontend-design`

Invoke `frontend-design:frontend-design` with the Skill tool, now, before reading anything else. Then apply these overrides to it, which win over its text:

- Its **design plan** (4–6 hex palette, typefaces, layout concept) becomes the **component plan** in step 3. The palette and type already exist as tokens.
- Its **hero / memorable thing / aesthetic risk** belongs to the brief's signature, which is motion on generated screens. A library component is **quiet**: it spends no boldness of its own.
- Its **confirm with the client** becomes: record a gap and carry on.
- Keep everything else: the review against defaults, the clusters it calibrates against, the copy rules, the quality floor, the screenshot critique, the specificity warning.

## 2. Read the sources

Read in full: `docs/design-brief.md`, every file in `docs/adr/`, `GLOSSARY.md`, the component's item in `docs/spec.md` § Component pieces, `lint/taste/RULES.md`, `src/registry/entry.ts`, and `tokens/tokens.css` (the **closed vocabulary**: a class compiles only if this file defines it). Read every existing component in `src/components/` so this one matches their conventions.

## 3. Write the component plan

Write `src/components/$ARGUMENTS/PLAN.md`, under a page:

- **Use**: the one-line registry `use` description: when a screen reaches for this component, and when it reaches for a sibling instead.
- **Anatomy**: the slots, and the Radix primitive and parts, if any.
- **Variants, sizes, states**: each with its reason in the brief. Fewer is better; every variant is a choice a generated screen can get wrong. An interactive component plans every state it can be in: rest, hover, pressed, focus-visible, disabled, and pending where it starts an operation. Each state is visibly distinct from rest.
- **Token map**: per slot and state, the exact token classes. Existing tokens only.
- **A11y contract**: role, accessible name, keyboard behaviour, focus (`:focus-visible` only), disabled and busy semantics, target size per density.
- **Motion**: which user action fires which `duration-*` / `ease-*`, and what reduced motion does instead.
- **Against defaults**: describe the shadcn/default version of this component in two lines, then each way this one differs and which brief line demands it. Where yours matches the default and the brief is silent, say so.

The plan is done when every variant and state has a token map and a brief line behind it.

## 4. Build

In `src/components/$ARGUMENTS/`:

- **`$ARGUMENTS.tsx`**: one `tv()` from `tailwind-variants/lite`, a slot per part. Its root element carries `data-component="$ARGUMENTS"`: the rendered gates find a component by that marker, as ESLint finds it by this folder. Props are `PropsOf<typeof entry>` from the registry entry, extended only with React's own (event handlers, `ref`) and one prop per registry slot: the `body` slot is `children`, and every other slot is a `ReactNode` prop of the slot's name (Card's `header`), which is how the code step fills it. The component takes no `className` and no `style`.
- **`$ARGUMENTS.registry.ts`**: the entry, built with `defineEntry` (ADR 0004): `name`, `use`, `slots` with their allow-lists, and a `props` schema whose variant enums come from `variantEnum(<tv config>, "<variant>")`, so the two can't drift.
- **`$ARGUMENTS.stories.tsx`**: `title: "Components/$ARGUMENTS"`; one story per variant, plus one per non-default state (disabled, pending, with icon…), with real product copy from the brief's domain (contractor invoices and payments), written to the brief's copy rules. A story that animates while idle (a pending sweep) carries the `animates-while-idle` tag, which gets it a mid-animation shot.
- Export it from the barrel, `src/index.ts`.

The build is done when the three files exist, every variant and state in the plan has its story, and the barrel exports the component.

## 5. Gate loop

From the repo root, run `pnpm gate $ARGUMENTS`. Its host steps (lint, typecheck, Storybook build) stop at the first failure, so a lint or type error hides the render gates until it's fixed. The render gates run in the pinned Playwright image (ADR 0009) and name each failure by story, theme and density.

Fix each failure **at its cause in the component**. The standard is everything outside `src/components/$ARGUMENTS/` and `src/index.ts`: `tokens/`, `lint/`, `gates/` and its existing baselines, `.storybook/` and `docs/` stay as they are. The gate writes a missing baseline to `gates/baselines/` on its own, and the human approves it from the contact sheet; that is expected. A baseline that already exists changes only by the human's `--update`.

The loop is done when `pnpm gate $ARGUMENTS` exits 0 with every test passed. After 5 failing runs, stop and report the remaining failures as they stand.

## 6. Critique the screenshots

Open every PNG of this component in `gates/out/contact-sheet/` with the Read tool. They are named `<story-id>--<theme>-<density>--<shot>.png`: each story at `rest`, plus `focus`, `hover` and `pressed` shots of its first control, and `mid-animation` for a story tagged `animates-while-idle`. Judge them against the brief's personality (warm, assured, plain-spoken), the density table, the radius table and the banned list, and against `frontend-design`'s default clusters. Then apply its mirror rule: remove one accessory.

If you change anything, go back to step 5. The critique is done when a full pass over the screenshots produces no change.

## 7. Report

Write `src/components/$ARGUMENTS/GAPS.md`: every place the brief, ADRs or tokens didn't decide something you needed (a missing token, an unstated state, a conflict between sources), the call you made, and the alternative a human might prefer. Each gap becomes a `needs-triage` issue that blocks the next component, so write each as one self-contained entry under its own `## <Title>` heading, which becomes the issue's title. When nothing was left open, write no GAPS.md. A gap is resolved by the human, in tokens or the brief, after this session.

End with a short summary: gate results, number of gate runs, what the critique changed, and the gaps. The loop pastes it into the PR description as it stands, so it describes the work done, not what to do with it.
