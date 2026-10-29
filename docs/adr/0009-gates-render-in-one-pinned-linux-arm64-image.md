# Gates render in one pinned Linux arm64 image, locally and in CI

Gate 6 compares screenshots against baselines, and screenshots only compare when one renderer made both. So the whole Playwright pass (gates 4, 6 and the render-time taste rules of gate 7) runs inside the official `mcr.microsoft.com/playwright` image, pinned to the exact `@playwright/test` version, both when `pnpm gate` runs on the Mac and in CI. The Mac is Apple Silicon, so Docker runs the arm64 image, and CI runs on GitHub's `ubuntu-24.04-arm` runner to match it: Chromium's antialiasing can differ between architectures. With one renderer, gate 6 allows zero differing pixels. The prototype's macOS baselines are discarded.

## Decisions that come with it

- **CI is one job running the local commands.** On every PR and every push to main: frozen install; the token build, then a clean `git status --porcelain` ([ADR 0005](0005-dtcg-tokens-hand-built-into-css-ts-and-figma.md)); Vitest; then `pnpm gate` with no argument, which gates every component and kept screen as [ADR 0006](0006-one-gated-build-component-session-per-component.md) describes. It is the one required status check on main, with no review required. The Playwright report and contact sheet are uploaded as artifacts on every run. The gate's own end-to-end tests (`pnpm test:gate`, fixture stories against scratch baselines) run in a second workflow, only when a change touches the gate, Storybook config, tokens or dependencies; it isn't a required check, since a path-filtered check would sit pending on every other PR.
- **Missing baselines fail in CI.** CI runs Playwright with `--update-snapshots=none`. A build-component session may still write missing baselines; CI is the line that catches a story nobody approved.
- **Chromium only.** Every story already renders in light/dark × admin/contractor; WebKit isn't gated.
- **Every change goes through a PR**, each build-component run included. The human approves new baselines on the component's PR, from the contact sheet artifact, and merges.
- **Baselines** live in one directory, `gates/baselines/<story-id>--<theme>-<density>.png`, in plain git (no LFS). A story tagged `animates-while-idle` also has `…--mid-animation.png` (its animations paused a quarter in) and `…--reduced-motion.png`, since the rest shot shows neither, and a built-CSS bug once broke a running animation that only the rest baseline was watching. `maxDiffPixels: 0` and a per-pixel `threshold` of 0: one renderer makes both images, and Playwright's default threshold (0.2) let a one-pixel change in the faint line colour through. A story that proves flaky may loosen its own tolerance with a recorded reason.
- **Only the human changes an existing baseline**: `pnpm gate <Component> --update`, in the image, committed in the PR that caused the change and reviewed in GitHub's image diff. No workflow rewrites baselines.
- **Playwright is bumped by hand**, image tag and `@playwright/test` together, in its own PR that re-renders every baseline and changes nothing else. No dependency bot touches either.
- **A generated screen enters CI only as a kept screen**: its TSX committed under `src/screens/`, with a story per screen state. `pnpm gate` then treats it like a library component. Gate 6 doesn't judge the generator (gates 1–4 and evals do); it protects kept screens from later library changes. Fresh generator output stays in eval scratch ([ADR 0008](0008-eval-runs-are-a-budgeted-script-compared-after-the-fact.md)).
- **CI holds no secrets.** It never calls the Claude API or Figma. Evals run by hand and their results files are committed by hand; CI only typechecks and unit-tests the eval code with a stubbed `generate()`.
- **Storybook deploys to GitHub Pages** from a second job on push to main, after the gate job passes, using its built `storybook-static`. No PR previews; the artifacts cover review. The same job runs `pnpm evals:report` on the newest committed results file and publishes it at `/evals/`, without screenshots, which exist only in local scratch.
- **The repo goes public now**, not at launch: arm64 runners are free only on public repos, and Pages needs it public anyway.

## Considered options

- **CI as the only renderer of baselines**: no Docker on the Mac, but the build-component session loses gate 6, which it relies on.
- **macOS baselines and a macOS runner**: slow, and still drifts with the macOS version.
- **The x64 image locally under emulation** (`--platform linux/amd64`): matches the default runner, but makes every `pnpm gate` far slower, in every build-component session too.
- **x64 CI with a looser diff threshold**: the prototype's `maxDiffPixelRatio: 0.002` lets ~500 pixels of a 640×400 shot change, enough to hide a 1px border.
- **Chromatic**: a second baseline system next to gate 6. **Vercel, Netlify or Cloudflare Pages**: PR previews, at the price of another account and secret.
- **Library stories only, no generated screens in gate 6**: simpler, but a library change that breaks a real screen goes unseen until someone regenerates it.

## Consequences

`pnpm gate` needs Docker on the Mac, and the build-component session runs it through `pnpm`, so its allowlist doesn't change.
