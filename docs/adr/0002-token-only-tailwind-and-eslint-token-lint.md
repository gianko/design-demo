# Tokens are the only styling vocabulary, and ESLint alone enforces it

The component library is built on native HTML elements and Tailwind v4. Native `<dialog>`, `<input type="checkbox">` and `<button>` give the top layer, focus and keyboard behaviour the components need, so Radix Primitives is a fallback for a part no native element can carry, not a dependency (amended in [#251](https://github.com/gianko/design-demo/issues/251)). The token build emits `@theme inline { --*: initial; … }`, so Tailwind's default palette and scale don't exist: the only classes that compile are the ones our tokens define, mapped to mode-aware `--ds-*` variables. That gives the agent a closed vocabulary, so generating `bg-gray-100 p-6 rounded-lg` becomes an immediate, specific failure the repair loop can act on. Token lint (gate 2) is ESLint only, in three layers: core rules (no `style`, no raw SVG colours, imports only through the library barrel, no Radix outside the library); `eslint-plugin-better-tailwindcss` (`no-unknown-classes` against our own theme file, `no-restricted-classes` for arbitrary values, `-(--x)` and bare numbers, `no-concatenated-classes`); and `@eslint/css` + `tailwind-csstree` with our own `no-raw-css-values` rule for `.css` files and `@apply`. A fixture of planted violations is kept as a test of the lint config, so a plugin upgrade can't quietly open a hole. Findings are in [Research styling approach and token lint options](https://github.com/gianko/design-demo/issues/4).

## Decisions that come with it

- **Library components take no `className`.** They change appearance only through typed variant props, so the registry describes everything a screen can change. Stack takes token-union props for layout spacing.
- **Variants are written with `tailwind-variants/lite`**, one `tv()` per component with a slot for each part. Nothing merges classes and `tailwind-merge` is never installed: it silently drops custom size tokens (`twMerge("text-caption text-fg")` → `"text-fg"`).
- **Density is a CSS scope.** `data-density="admin|contractor"` on a screen root flips the density variables; components use density-role tokens and never know which density they're in. This answers the open consequence of [ADR 0001](0001-density-by-audience.md).
- **Theme is an explicit `data-theme="light|dark"` attribute**, light by default, so Storybook, visual baselines and Figma captures can pin a mode. No automatic OS following in P0.
- **Bare-value families get named utilities**: `duration-{fast,base,slow}` plus exit variants, `ease-{standard,exit,settle}`, `z-{raised,overlay,toast}`, one `delay-stagger` step, and `focus-ring` (outline width and offset from the `edge` size, colour from `ring.focus`), used as `focus-visible:focus-ring` because outline and ring widths take only bare numbers. Text roles (`text-caption` … `text-figure`) are named utilities too, so their line height and tracking compile as plain `var(--ds-*)` ([ADR 0005](0005-dtcg-tokens-hand-built-into-css-ts-and-figma.md), [#104](https://github.com/gianko/design-demo/issues/104)). `opacity-*` is banned; disabled states use colour roles.
- **Motion is CSS only**: token utilities and keyframes, the View Transitions API for the two signature transitions, and stagger owned by the library (`:nth-child` × `delay-stagger`), so the `style` ban has no exceptions. Motion (the library) is the fallback if View Transitions can't carry the row → sheet transition with a native dialog.

## Considered options

- **CSS modules**: smaller lint surface and no dependencies, but each generated screen becomes two files, class names are agent-invented with typos that still type-check, and there's no closed vocabulary for the repair loop.
- **Stylelint**: caught raw CSS values with no custom code, but can't see TSX classes or `@apply`, and would add a second tool to the repair loop.
- **`eslint-plugin-tailwindcss`**: missed arbitrary properties (`[color:#f00]`), the `p-(--x)` shorthand and template-literal classes.
- **`cva`**: what models write by default, but it has no slots, so every part needs its own `cva()` kept in step by hand, and 1.0 is still in beta.
- **A `density` prop or Tailwind density variants**: every component would carry density logic, and class strings would double.
- **Motion (the library) by default**: built for shared-element transitions, but its JS-number props open a second raw-value surface for token lint.

## Consequences

Tailwind + variants is most of the shadcn stack, so the stack itself does nothing to prevent shadcn silhouettes. The design brief's ban on them is enforced by the brief and by taste lint.
