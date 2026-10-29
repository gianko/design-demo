# Component frames are generated from each component's `tv()` config

[ADR 0007](0007-figma-sync-is-a-generated-one-call-script.md) names the pattern for component frames (a deterministic script that finds the page, sets and variants by name and updates them in place), but not where a frame's variants and styling come from. They come from the component's own `tv()` config, the one source that is already the code's styling, already feeds the registry, and can be read without a render. For each component, the generator takes the registry's variant props as axes, the same options `variantEnum` reads from `tv()` ([ADR 0004](0004-flat-library-only-ui-spec-and-zod-first-registry.md)), and calls the component's `tv()` once per combination, which resolves compoundVariants. It then maps every class in each slot's string to Figma:

- colour, radius and shadow classes go to variables and effect styles, through `tokens.css`'s class → `--ds-*` mapping and the variables' WEB code syntax
- layout classes go to auto layout with bound padding and gap
- type classes go to the text styles `figma:sync-tokens` makes

Decided in [Figma: component frames for the library](https://github.com/gianko/design-demo/issues/286), in the P2 grilling session on 2026-10-29.

## Decisions that come with it

- **An unmapped class fails generation.** Pseudo-state prefixes (`hover:`, `active:`, `focus-visible:`, `before:`) are on an explicit skip list, so frames show the rest state. Any other class the generator can't map stops it, so drift shows up when the script is generated, not in Figma.
- **Sample copy is a small hand-written table** ("Approve and pay"), because a component's text comes from its props and JS, not from `tv()`.
- **Which components get sets:**
  - **Variant sets:** Button (intent × disabled × pending; pending is a code-only prop, but it's a look a designer comments on), StatusTag (status), Toast (tone), Text (size × tone; `live` isn't visual), Heading (level) and Amount (display).
  - **One-variant sets with named auto-layout slot placeholders:** Card, EmptyState, PageHeader, Sheet and DataTable.
  - **Internal entries get sets too, marked internal in their descriptions:** Checkbox (checked × disabled) and IconButton. A designer looking at a table or a sheet sees them.
  - **No sets:** Screen and Stack. Stack is auto layout itself, and Screen only sets density.
- **Density isn't an axis.** It's the Density collection's modes, so a designer flips the mode on a frame.
- **No nested instances.** A slot is a placeholder, not a Checkbox or IconButton instance.
- **`figma:sync-components` runs on `figma:sync-tokens`'s runtime and after it,** since it binds to the variables that command makes. It has the same checksum, dry run with a diff and orphans, apply that re-diffs inside the same call, 50,000-character limit, `--split` (one script per component set) and tests against the fake Plugin API.
- **The script owns the Components page.** Anything on it that the script didn't generate is an orphan in the dry run. The Button set hand-built in [#15](https://github.com/gianko/design-demo/issues/15) is replaced on the first apply, after its dry run has been read, and from then on re-runs update in place by name.

## Considered options

- **Stories as the source:** they're content and layout cases, not a variant grid. Button has no PendingQuiet story.
- **Captures converted into components:** faithful to the render, but captures bind by value, which misses alpha colours, text styles and SVG strokes. A capture is also a separate MCP call, so the sync couldn't be one atomic `use_figma` call.
- **Hand-written frame descriptors:** simple, but they'd drift from the code with every `/build-component` session.
- **Nested instances in composite frames:** closer to how a designer builds, but not needed for the brief's bar ("a designer can open it and comment"). It's left for later.
