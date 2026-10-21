# The UI spec is a flat, library-only node list, checked against a Zod-first registry

A UI spec is one flat list of nodes (`id`, `component`, `parent`, `slot`, `props` as `{ name, value }` pairs with JSON-string values, optional `when` and `action`), plus a top-level `audience`, `states` and `actions`. It's flat because structured outputs reject recursive schemas and cap optional and union-typed parameters per request ([ADR 0003](0003-generator-on-messages-api-not-an-agent-loop.md)). The flat list is the only stored form, and the code step receives it as-is. A screen is built from library components only: the UI spec names nothing else, and generated TSX contains no intrinsic JSX elements (a gate 2 rule). That way gate 1 sees the whole screen before any code exists. The registry is one Zod-first entry per component (`*.registry.ts`): props, a one-line `use` description and named slots. Variant enums are read from the component's `tv()` config, and the component's props type is `z.infer` of the entry, so the registry and the library can't drift, and there's no codegen to fall behind.

## Decisions that come with it

- **The UI spec carries layout and copy.** Stack and Grid nodes with token props hold the full layout; every user-facing string is a literal prop. The code step wires data, behaviour and motion, and writes no copy.
- **Audience.** `audience: "admin" | "contractor"` is copied from the screen brief's frontmatter, and the screen root sets `data-density` from it ([ADR 0001](0001-density-by-audience.md)).
- **Typography is library components.** Heading (`level` 1–3), Text (`tone`, `size`) and Amount (`value`, `currency`, `display: table|card`) join the library; Amount owns tabular figures, cents and currency format.
- **Data comes from one shared, typed fixtures module.** A prop value is a literal or `{ "bind": "<path>" }`. `row.*` paths resolve only inside a DataTable column's `cell` slot, whose single template node renders once per row.
- **Data states vs screen states.** Overdue, paid and failed come from the bound data. Empty, loading, error and rows-selected are declared as `states: [{ name, fixture }]`; nodes may carry `when: [state]`; every declared state is rendered for visual baselines and Figma captures.
- **Actions are declared, not improvised.** `actions: [{ name, operation, pending, to }]`, where `operation` is one of the fixtures module's mock async operations, each with a deterministic success and failure. The code step implements the wiring.
- **Slots** are named per registry entry, with an allow-list where nonsense is likely (`PageHeader.actions` takes Button and IconButton). Siblings are ordered by position in the node list.
- **Gate 1 checks**, each failure naming the node id and the rule: the wire shape parses; ids are unique, there's one root, parents exist and there are no cycles; components are registered, slots exist and allow-lists hold; props parse against the entry; bindings resolve with type fit and row scope; states and actions are consistent; `audience` matches the screen brief; heading levels don't skip and there's one level 1.
- **The registry version is a content hash.** The registry serializes once (names, `use` lines, `z.toJSONSchema` props, slots) into the spec step's cached system prefix; its hash is the registry version in every eval results file's version tuple ([ADR 0008](0008-eval-runs-are-a-budgeted-script-compared-after-the-fact.md)). The wire schema's `component` enum is generated from the same registry.

## Considered options

- **Raw elements with token classes beside library components**: more freedom, but gate 1 can't see them, and each generated screen would invent its own headings and spacing.
- **Layout left to the code step**: layout mistakes would surface only after code is written and rendered.
- **Codegen from TS prop types** (ts-morph or react-docgen): a generated file, a CI drift check, and JSDoc tags to carry descriptions and slots, plus rules for types the wire can't express.
- **Registry from Storybook metadata**: the same docgen one step removed, with the generator tied to the Storybook build.
- **A nested tree after gate 1 for the code step**: two forms to version and diff in eval comparisons. If the code step later reads a nested view better, rendering one into its prompt is a local change.
- **Inline sample data, or data invented by the code step**: reps would render different data, so eval runs, baselines and captures wouldn't compare.
