# Style expectations are read-only `play` functions, run by gate 8

A criterion about a rendered story's computed style, such as Card's padding under contractor or a Heading's `text-wrap-style`, had nothing that could assert it. The baselines guard the look, but a screenshot doesn't assert a number, and a changed baseline is re-approved by eye. So a story states its own style expectations as its `play` function: `storybook/test`'s `expect` against `getComputedStyle`, branching on `globals.theme` and `globals.density` where the value differs. The gate's Playwright pass reports a failing one as gate 8, in every theme × density, on the pinned image ([ADR 0009](0009-gates-render-in-one-pinned-linux-arm64-image.md)) and in CI's `pnpm gate`. Decided in [Nothing asserts a story's computed styles](https://github.com/gianko/design-demo/issues/155).

## Decisions that come with it

- **On the story, in the component's own stories file.** A `/build-component` session edits only its own component ([ADR 0006](0006-one-gated-build-component-session-per-component.md)), so it can add them, and a reader finds them next to the story they're about.
- **A `play` function only reads.** It changes nothing in the page, so the rest shot and the state shots, and their baselines, are what they'd be without it.
- **The gate waits for the play phase.** Storybook shows a story before its `play` runs and rethrows a failure afterwards, so a render isn't checked until play has finished or failed. A failure is gate 8, not `script-error` or a failed render, and names the story, theme and density like gates 4, 6 and 7.
- **The generator writes none.** The code step writes no `play` functions, so generated screens have no style expectations and gate 8 adds nothing to eval columns ([ADR 0008](0008-eval-runs-are-a-budgeted-script-compared-after-the-fact.md)) or repair turns ([ADR 0010](0010-each-generator-step-repairs-itself-from-normalised-gate-failures.md)). A step that wrote its own expectations would grade itself. A saved screen can gain them later.
- **A `phone` tag renders a story at 360×800.** `play` can't resize the viewport, so a story tagged `phone` renders at 360×800 in place of 1280×800, in every theme × density, with baselines of its own. Its id differs from the wide story's, so baseline names keep ADR 0009's form. `index.json` carries tags, so the gate reads it as it reads `animates-while-idle`.

## Considered options

- **Declarative `parameters` data the gate interprets** (`{ selector, property, value }`): it couldn't touch the page, and a failure could carry a selector and HTML like a taste rule's finding. But relative values (the viewport's height, a measure in `ch`, a token's colour) would each need an escape hatch in a mini-language, and `index.json` doesn't carry `parameters`, so the gate would have to read them from the page.
- **Folding them into gate 7:** taste rules hold every story to the design brief; a style expectation belongs to one story.
- **A separate harness** (Storybook's Vitest addon, Vitest browser mode): a second renderer and browser beside the pinned image, and `pnpm gate <Component>` would no longer be the whole check.
- **Cases in `gates/gate.e2e.ts`:** that suite tests the gate on its fixtures, and a component session can't edit it.
- **No phone renders, asserting Card's computed `max-width` at 1280 only:** a ceiling can't widen a card on a narrow screen, but the contractor's usual device would still have no render.
