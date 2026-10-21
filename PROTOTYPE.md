# PROTOTYPE: how Claude Code builds one component

Throwaway branch for wayfinder ticket [Prototype how Claude Code builds one component against the design brief](https://github.com/gianko/design-demo/issues/13). Never merged.

- `.claude/skills/build-component/SKILL.md`: the draft build recipe under test.
- `proto/`: a minimal library scaffold: hand-written stand-in tokens (`src/tokens/tokens.css`), Tailwind v4 closed theme, Storybook, and `pnpm gate <Component>` (gates 2, 3, 4, 6, 7).
- `proto/runs/`: transcripts of headless build sessions.

Run Storybook: `cd proto && pnpm install && pnpm storybook`.
