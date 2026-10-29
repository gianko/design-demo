## Working copy

Each session works in its own git worktree (Claude Code: `EnterWorktree`). The main checkout is shared, and other sessions edit it concurrently.

Keep a session's files inside its worktree: edit them with Write/Edit, and put scratch files in the worktree's `.scratch/`, which git and the linters ignore.

## Agent skills

### Issue tracker

Issues live in GitHub Issues for `gianko/design-demo`, managed with the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

Default vocabulary: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

To triage an issue, including a `<Component> gap:` issue, follow `.claude/skills/triage/SKILL.md`. It's user-invoked, so read the file rather than calling the Skill tool.

### Pull requests

Work that spans several tickets (`/implement-spec`, `/implement`) lands as stacked pull requests, one per ticket, never one integration PR. See `docs/agents/pull-requests.md`.

### Domain docs

Single-context: one `GLOSSARY.md` and `docs/adr/` at the repo root. See `docs/agents/domain.md`.
