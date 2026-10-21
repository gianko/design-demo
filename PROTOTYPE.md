# PROTOTYPE: how Claude Code builds one component

> Branch `prototype/figma-spike` forks this prototype for [Figma spike: variables, a component frame, a capture, and the shape of figma:sync-tokens](https://github.com/gianko/design-demo/issues/15). Its findings are in [`proto/spikes/figma/FINDINGS.md`](proto/spikes/figma/FINDINGS.md); the spike also moves every theme value in `tokens.css` to a `--ds-*` variable and injects the Figma capture script into Storybook.

Throwaway branch for wayfinder ticket [Prototype how Claude Code builds one component against the design brief](https://github.com/gianko/design-demo/issues/13). Never merged.

- `.claude/skills/build-component/SKILL.md`: the draft build recipe under test.
- `proto/`: a minimal library scaffold: hand-written stand-in tokens (`src/tokens/tokens.css`), Tailwind v4 closed theme, Storybook, and `pnpm gate <Component>` (gates 2, 3, 4, 6, 7).
- `proto/runs/`: transcripts of headless build sessions.

Run Storybook: `cd proto && pnpm install && pnpm storybook`.
