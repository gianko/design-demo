# Each component is built by one gated `build-component` session

The build loop builds the design system one component per iteration. Each iteration is a fresh headless Claude Code session running one project skill, `/build-component <Component>`, that is user-invoked (no description in context). The skill invokes `frontend-design` first, overrides its page-oriented steps, and then holds the session to the design brief through gates it runs itself. A fresh session is what makes the result repeatable: it sees only the repo, never the conversation that wrote the brief. In [the prototype](https://github.com/gianko/design-demo/issues/13), two unattended Button runs took 6–8 minutes and about $1.40 each (CLI estimates), and the second passed every gate on its first run once the token gaps from the first had been filled. Findings and transcripts are on the `prototype/build-component` branch.

## Decisions that come with it

- **The recipe, in order:** invoke `frontend-design:frontend-design` with the Skill tool; read the design brief, every ADR, the glossary, the tokens and every existing component; write `PLAN.md`; build the component, its `*.registry.ts` entry ([ADR 0004](0004-flat-library-only-ui-spec-and-zod-first-registry.md)) and its stories, and export it from the barrel; loop on `pnpm gate <Component>` (at most 5 runs); critique the screenshots; write `GAPS.md` and a summary.
- **`frontend-design` overrides.** Its palette-and-type design plan becomes the **component plan**: the registry `use` line, the anatomy, every variant and state with the brief line behind it, a token map per slot and state, the a11y contract, motion per user action, and the default (shadcn) version named next to each way this one differs. Its "one memorable thing" belongs to motion on generated screens, so components stay quiet. Its "confirm with the client" becomes "record a gap and carry on". The rest of the skill stands: its default clusters, copy rules, quality floor and screenshot critique.
- **Interactive components plan every state.** Rest, hover, pressed, focus-visible, disabled, and pending where the component starts an operation, each visibly distinct from rest.
- **Gates run as one command per component.** `pnpm gate <Component>` runs gate 2 and static taste rules (ESLint) and gate 3 (tsc), then builds Storybook. A Playwright pass then covers every story in light/dark × admin/contractor: axe (gate 4), `toHaveScreenshot` (gate 6) and render-time taste rules (gate 7). It also takes hover, pressed and focus shots for the critique. Storybook's a11y addon runs manually, so its axe can't collide with the gate's.
- **Baselines.** The session writes missing baselines. The human approves them from the contact sheet when reviewing the component's issue. Changing an existing baseline always needs the human.
- **What the session never edits:** tokens, the design brief, the lint config, the gate scripts and existing baselines. Token gaps are filled before the loop starts. Any new gap is recorded in `GAPS.md` and becomes a token issue that blocks the next component.
- **The session runs isolated:** `claude -p --setting-sources project`, `frontend-design` as the only plugin, `--permission-mode acceptEdits` and an allowlist for `pnpm` and `npx`, with the transcript written outside the working tree. In the prototype, a user-level hook leaked into the first run and broke its allowlist.
- **No `/design`, `/design-sync` or artifacts.** Their output lands on a canvas rather than in the repo, so no gate can see it, and neither prototype run reached for them.
- **The row → sheet transition uses the View Transitions API with a Radix Dialog.** The shared name is set by a class, so the `style` ban holds. It works in Chromium and WebKit, and reduced motion leaves a crossfade. Focus returns to the row through `onCloseAutoFocus`, because the sheet opens programmatically. Motion (the library) isn't needed as a fallback ([ADR 0002](0002-token-only-tailwind-and-eslint-token-lint.md)).

## Considered options

- **Several components per session:** fewer re-reads of the brief, but bigger diffs, and a later component inherits an earlier one's context instead of only what the repo records.
- **Letting the session add tokens it needs:** faster, but each session would make its own taste calls, and the tokens would drift.
- **Gaps logged, with the human triaging after every component:** most gaps in the first run were the same missing state roles, which are cheaper to fill once up front.
- **`/design`:** see above.

## Consequences

The gate's rest shots disable animations, so an infinite animation (the pending sweep) can't be seen in any of them. The real gate needs a mid-animation shot for components that animate while idle.
