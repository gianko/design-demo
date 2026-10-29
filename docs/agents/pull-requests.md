# Pull requests: one per ticket, stacked

This repo's override of the vendored `implement-spec` and `implement` skills. Where they say "a single integration branch" or "one draft PR", build a **stack** instead: one branch and one PR per ticket, so each PR stays reviewable.

## Shape the stack from the blocking edges

- **The base:** the spec's decision commit (ADRs, glossary, demo brief), as its own PR against `main`, if it isn't on `main` yet. Otherwise `main`.
- **A ticket with no open blocker** gets a branch off the base and a PR against it.
- **A blocked ticket** gets a branch off its blocker's branch and a PR against that branch.
- **Siblings that extend the same module** (the same tables, the same generator, the same cost estimate) go one after another, the second on the first's branch, not side by side. Parallel siblings each invent the shared piece, and a merger then has to reconcile two versions of it. Run siblings in parallel only when their files don't overlap. An alternative is to have the tracer ticket define the shared piece first.
- **Merges are merge commits**, never squash or rebase, so every PR above keeps its history.

The repo deletes a PR's branch when it merges (`delete_branch_on_merge`), and GitHub then points each PR stacked on it at the merged PR's base. Nothing needs retargeting by hand.

## After any PR merges into `main`

Check the other open PRs' `mergeable` straight away. Parallel stacks keep adding lines to the same places: the README's "Run it" block, its gates table, `package.json` scripts. So every merge into `main` can conflict the other stacks again. Fix each stack at its bottom:

1. Merge `origin/main` into the bottom branch, keeping both sides of each line-addition conflict.
2. Run the checks, push, then merge that branch into the next one up, and so on to the top.

## The review-fix pass

The `code-review` step reviews the stacks together. To get one diff, build a local, unpushed branch that merges every stack's top. The fix agent then fixes each finding in the lowest PR it belongs to and merges it up. It also rewrites the description of every PR whose numbers, behaviour or evidence it changed, so the descriptions match the code.
