# Research: styling approach and token lint

Resolves #4 (part of #1, feeds #9). Answers demo brief §9 Q4 (Radix + Tailwind v4 vs CSS modules) and Q8 (how token lint is implemented). Researched 2026-10-21.

Method: official docs and package READMEs for each claim, current versions from the npm registry, and a throwaway lab that ran every candidate linter against the same deliberately bad fixtures. The lab results below are observed output, not inferred from docs. Lab configs are reproduced in the appendix so #9 can lift them.

## TL;DR

- **Radix is orthogonal to the styling choice.** Radix Primitives are unstyled, take `className` on every part, and expose state as `data-state`; they work the same under Tailwind or CSS modules ([Radix styling guide][radix-styling]). The real choice is Tailwind v4 vs CSS modules.
- **Tailwind v4 can compile the token set down to the only classes that exist.** `@theme { --*: initial; … }` removes every default utility driven by a theme namespace, so `bg-red-500`, `p-5` and `rounded-lg` stop existing ([Tailwind theme docs][tw-theme]). The lab confirmed this, and found two holes: the classes are **silently dropped**, not reported, and **arbitrary values (`p-[13px]`, `bg-[#fff]`) and bare-number utilities (`duration-150`, `z-50`, `opacity-50`) still compile**. So the theme reset is an allowlist, but only a linter makes it fail loudly.
- **One ESLint config covers TSX, CSS and Tailwind classes.** Three pieces: ESLint core rules (inline styles, SVG colours, imports outside the barrel), `eslint-plugin-better-tailwindcss` (unknown classes measured against our own theme file, plus a regex ban list), and `@eslint/css` + `tailwind-csstree` with one ~50-line custom rule for `.css` files, `@apply` included. In the lab it caught every planted violation. Stylelint is not needed.
- **Stylelint only sees CSS.** It caught all the raw values in `.css` with zero custom code, but it cannot see TSX `className` strings or `@apply` arguments. It would also be a second tool with a second output format in the repair loop.
- **Recommendation:** Radix Primitives + Tailwind v4 with a tokens-only `@theme` generated from the token JSON. Token lint (gate 2) is ESLint only, built from the three pieces above. Details are under [Recommendation](#recommendation).

## Versions checked (npm registry, 2026-10-21)

| Package | Version | Note |
| --- | --- | --- |
| `tailwindcss` / `@tailwindcss/vite` | 4.3.3 | |
| `radix-ui` (monopackage) | 1.8.1 | `@radix-ui/react-dialog` 1.3.1 |
| `eslint` | 10.13.0 | |
| `@eslint/css` | 2.0.1 | official ESLint CSS language plugin |
| `tailwind-csstree` | 0.4.1 | Tailwind v4 syntax for `@eslint/css` |
| `eslint-plugin-better-tailwindcss` | 4.10.0 | peer `eslint ^7–^10`, `tailwindcss ^3.3 \|\| ^4.1.17`; also runs under Oxlint |
| `eslint-plugin-tailwindcss` | 4.4.0 | v4 rewrite; peer `eslint ^9 \|\| ^10`, `tailwindcss ^4` |
| `stylelint` | 17.16.0 | |
| `stylelint-declaration-strict-value` | 1.12.1 | peer `stylelint >=16 <=17` |
| `typescript-eslint` | 8.72.0 | |
| `eslint-plugin-react` | 7.37.5 | **peer `eslint ^9.7`; no ESLint 10 support, last release Apr 2025** |
| `tailwind-merge` | 3.7.0 | |
| `storybook` | 10.6.3 | |
| `vitest` / `@playwright/test` | 5.0.5 / 1.64.1 | |
| `vite` | 8.3.4 | |

## 1. Styling: Tailwind v4 vs CSS modules (Radix either way)

### Facts

- **Radix:** "Radix Primitives are unstyled—and compatible with any styling solution". "All components and their parts accept a `className` prop". State is exposed in "a `data-state` attribute" ([radix-styling]). In Tailwind that reads `data-[state=open]:bg-accent`. The lab confirmed this passes both Tailwind lint plugins: the `[...]` in a variant is not an arbitrary value.
- **Tailwind theme = tokens:** every `@theme` variable becomes a CSS variable, and each namespace (`--color-*`, `--spacing-*`, `--radius-*`, `--font-*`, `--text-*`, `--font-weight-*`, `--leading-*`, `--tracking-*`, `--shadow-*`, `--ease-*`, `--animate-*`, …) drives a family of utilities. `--*: initial` disables the whole default theme: "you'll only be able to use utility classes matching your custom theme variables" ([tw-theme]). For variables that reference other variables (our `--ds-*` light/dark mode variables), use `@theme inline` ([tw-theme]).
- **Arbitrary values bypass the theme by design:** "use Tailwind's square bracket notation to generate a class on the fly with any arbitrary value… This works for everything in the framework". Arbitrary properties (`[mask-type:luminance]`) are "_really_ like inline styles". The v4 shorthand `fill-(--my-brand-color)` is "a shorthand for `fill-[var(--my-brand-color)]`" ([tw-custom]).
- **Dynamic class names are not supported:** Tailwind "has no way of understanding string concatenation or interpolation", so `bg-${color}` silently produces no CSS ([tw-detect]).
- **CSS modules in Vite:** built in. "Any CSS file ending with `.module.css` is considered a CSS modules file" ([vite-css]). No dependency is needed. Vite's type shim declares every module as `{ readonly [key: string]: string }` ([vite-client-dts]), so `styles.typo` type-checks: **class-name typos are silent** unless you add a separate TS plugin or codegen.
- **Storybook / Vitest / Playwright:** Storybook's Vitest addon "requires a Vite-based Storybook framework" and runs stories as tests in "Playwright's Chromium browser" ([sb-vitest]). Both options are Vite-native. Tailwind v4 adds the `@tailwindcss/vite` plugin ([tw-vite]) and a CSS import in `.storybook/preview`. Storybook's own Tailwind recipe still shows the v3 `tailwind.config.js` setup ([sb-tailwind]), so follow Tailwind's Vite guide instead. CSS modules need nothing extra.

### Lab observations (Tailwind 4.3.3, tokens-only `@theme`)

Compiling a fixture with `@theme { --*: initial; --color-accent…; --spacing-1…4; --radius-sm|md; --font-body; --text-sm|md }`:

| Class in TSX | Emitted? | Why |
| --- | --- | --- |
| `p-4`, `bg-accent`, `rounded-md`, `text-sm`, `font-body` | yes, as `var(--spacing-4)` etc. | token |
| `p-5`, `bg-red-500`, `rounded-lg`, `font-bold`, `shadow-md`, `ease-in-out`, `text-white` | **no, silently** | namespace reset |
| `p-[13px]`, `bg-[#fff]`, `rounded-[3px]`, `text-[14px]`, `font-['Inter']`, `m-[2rem]` | **yes** | arbitrary values always compile |
| `duration-150`, `delay-75`, `z-50`, `opacity-50`, `border-2`, `grid-cols-3`, `w-1/2` | **yes** | bare-value utilities read no theme namespace |
| `duration-fast`, `z-overlay` | yes, as `var(--duration-fast)` | defined with `@utility duration-* { transition-duration: --value(--duration-*); }` |

So motion durations and z-index need a named `@utility` per token family, plus a lint ban on the bare numbers. That matters because the brief makes motion tokens first-class.

### How generated screen code reads

Tailwind (one file per screen; the tokens show up in the markup):

```tsx
<Card className="flex flex-col gap-3 p-4">
  <PageHeader title="Invoices" />
  <DataTable … className="data-[state=loading]:opacity-muted duration-fast" />
</Card>
```

CSS modules (two files per screen; the agent invents class names; values live in the second file):

```tsx
<Card className={styles.panel}>…</Card>
```
```css
.panel { display: flex; flex-direction: column; gap: var(--ds-space-3); padding: var(--ds-space-4); }
```

Trade-offs that matter for this project:

- **Lint surface.** CSS modules has the smaller surface: every value is in CSS, so one CSS rule covers everything. Tailwind needs three layers (below). Under Tailwind, though, the allowlist is the compiled theme itself, so the lint can't drift from the token JSON.
- **Repair loop signal.** Tailwind violations come back as a single class at a precise column (`Unknown class detected: bg-red-500`). With CSS modules the failure is in a file the UI spec never mentions.
- **Spec → code step.** The code step emits one file per screen under Tailwind and two under CSS modules.
- **Agent fluency vs pull toward defaults.** Models write Tailwind fluently, but they default to the stock palette and scale (`bg-gray-100 p-6 rounded-lg`). The theme reset plus `no-unknown-classes` turns that habit into an immediate, specific gate failure. That is useful for the Loom's "failing gate → repair" beat. Radix + Tailwind + `cva` is also exactly the shadcn stack, so the brief's "no shadcn silhouettes" ban has to be enforced by the design brief and taste lint, not by the stack.
- **`cn()` / tailwind-merge hazard (lab):** `twMerge("text-caption text-fg")` returns `"text-fg"`, so a custom font-size name not on the default t-shirt scale is treated as a colour and **silently dropped**. `twMerge("rounded-card rounded-sm")` keeps both. Either name size tokens on the default keys (`text-sm`, `text-md` merged correctly in the lab), or configure `extendTailwindMerge` with our token groups ([tw-merge]). Skipping `tailwind-merge` entirely is also fine.
- **Bundle/setup.** Radix costs the same either way. Tailwind adds two dev dependencies (`tailwindcss`, `@tailwindcss/vite`) and no runtime JS. It emits only the utilities it detects, and compiling the lab theme took ~26 ms. CSS modules add nothing.

## 2. Token lint: the three options, run against the same fixtures

Fixtures planted every violation the brief's gate 2 names, plus edge cases: arbitrary values in `className`, `cn()`, `cva()` variants and `hover:` variants; arbitrary properties `[color:#f00]`; the v4 `p-(--x)` shorthand; default palette and scale classes; bare-number utilities; template-literal classes; `style={{…}}`; `<svg fill="#ff0000">`; deep and Radix imports; raw hex/rgb/px/font names/durations/shadows in `.module.css`; and `@apply p-[13px]` in CSS.

| Violation | A. ESLint: core + better-tailwindcss + @eslint/css custom rule | B. ESLint: core + eslint-plugin-tailwindcss (+ same CSS rule) | C. Stylelint (+ declaration-strict-value) |
| --- | --- | --- | --- |
| `p-[13px]`, `bg-[#fff]`, `hover:bg-[#000]`, inside `cn()`/`cva()` | ✅ `no-restricted-classes` regex | ✅ `no-arbitrary-value` | ❌ can't see TSX |
| arbitrary property `[color:#f00]` | ✅ | ❌ **missed** | ❌ |
| v4 shorthand `p-(--my-pad)`, `bg-(--any)` | ✅ after adding a second regex (missed by default) | ❌ **missed**, no regex option | ❌ |
| default palette/scale `bg-red-500`, `p-5`, `rounded-lg`, `font-bold` | ✅ `no-unknown-classes` vs our theme | ✅ `no-custom-classname` vs our theme | ❌ |
| bare numbers `duration-150`, `z-50`, `opacity-50` | ✅ third regex | ❌ no rule for it | ❌ |
| `` `p-${n}` `` concatenation | ✅ `no-concatenated-classes` | ❌ missed | ❌ |
| `style={{…}}` | ✅ core `no-restricted-syntax` | ✅ same core rule | ❌ |
| `<svg fill="#ff0000">` | ✅ core `no-restricted-syntax` selector | ✅ same | ❌ |
| deep import `@acme/ui/src/…`, direct `@radix-ui/*` | ✅ core `no-restricted-imports` | ✅ same | ❌ |
| raw hex/rgb/px/font/ms/shadow in `.css` / `.module.css` | ✅ custom rule (~50 lines) | ✅ same rule | ✅ zero custom code |
| `@apply p-[13px] bg-[#fff]` in CSS | ✅ custom rule checks `@apply` prelude | ✅ same | ❌ passed silently |
| Radix `data-[state=open]:bg-accent` (must pass) | ✅ passes | ✅ passes | n/a |
| Run time, whole lab | ~0.5 s | similar | similar |

Notes:

- **`no-unknown-classes` is the "allowlist plugin".** It reads the Tailwind v4 CSS entry point (`settings["better-tailwindcss"].entryPoint`), so the allowlist is whatever our generated `@theme` and `@utility` blocks define ([bt-unknown]). Nothing is hand-maintained. `no-restricted-classes` takes regex patterns with custom messages and optional fixes. Its own docs use arbitrary values as the example ([bt-restricted]). The plugin lints `cn`, `clsx`, `cva`, `tv`, `twMerge` and others out of the box ([bt-readme]).
- **`eslint-plugin-tailwindcss` v4** has `no-arbitrary-value` and `no-custom-classname` ([tw-plugin]), but no regex ban list. In the lab it missed arbitrary properties, the `(--var)` shorthand and concatenation. Both plugins worked on ESLint 10.
- **ESLint now lints CSS natively.** `@eslint/css` is an official ESLint language plugin, and `tailwind-csstree` adds Tailwind v4 syntax (`@theme`, `@apply`, `@utility`) through `languageOptions.customSyntax` ([eslint-css], [tw-csstree]). It has no "no raw values" rule built in, so we write one over the CSSTree AST. The lab version is ~50 lines and is in the appendix. `tailwind-csstree`'s README warns "Not all ESLint CSS plugin rules will work with Tailwind syntax"; our custom rule and `css/no-important` worked.
- **Inline styles without `eslint-plugin-react`.** Its `forbid-dom-props` would be the usual tool, but its peer range stops at ESLint 9. Core `no-restricted-syntax` with `JSXAttribute[name.name='style']` does the job with no plugin ([eslint-nrs]). Barrel enforcement is core `no-restricted-imports` with `patterns[].regex` ([eslint-nri]).
- **Stylelint** (`scale-unlimited/declaration-strict-value` plus core `color-no-hex` and `function-disallowed-list`) reported 14 problems covering every raw CSS value (some twice) with no custom code ([stylelint-dsv], [stylelint-rules]). But it does not understand Tailwind classes, and with `stylelint-config-standard` it would likely need at-rule ignores for `@theme`/`@utility` (not tested). It would also add a second config, a second CLI and a second message format to the repair loop. Its only advantage over option A is not needing the ~50-line custom rule, and that rule is something we want to own anyway: it is the base for taste lint (gate 7).
- **Residual gaps in every option.** Values computed in JS and passed to library props (e.g. `<Stack gap={13}>`) are the registry/type gate's job: props typed as token unions. An agent can still use a token-valued arbitrary class that is semantically wrong (`gap-1` where the rhythm wants `gap-3`). That is brief-conformance and taste lint (gates 5 and 7), not token lint.

## Recommendation

For the human to ratify in #9 (brief §9 Q4 and Q8):

1. **Library styling: Radix Primitives + Tailwind v4.** The token build emits a `tokens.css` holding `@theme inline { --*: initial; … }`. That block maps Tailwind namespaces to the mode-aware `--ds-*` variables, so light/dark stay pure CSS variables and mirror the Figma modes. Add one `@utility` per bare-value family the brief tokenises (`duration-*`, `delay-*`, `z-*`, `opacity-*`). Library components wrap Radix; generated screens never import Radix.
2. **Token lint (gate 2): ESLint only, one flat config, three layers.**
   - Core: `no-restricted-syntax` (`style` prop, raw colours in SVG attributes) and `no-restricted-imports` (anything but the barrel, any `@radix-ui/*` / `radix-ui`).
   - `eslint-plugin-better-tailwindcss`: `no-unknown-classes` with `entryPoint` set to the generated `tokens.css` (the allowlist *is* the token set), `no-concatenated-classes`, and `no-restricted-classes` with three patterns: `[...]` not followed by `:`, `-(--…)`, and bare `duration|delay|z|opacity-<n>`.
   - `@eslint/css` + `tailwind-csstree` + our own `lint/token/no-raw-css-values` rule for `.css`, `@apply` included.

   Reject Stylelint, which can't see TSX/Tailwind and would add a second tool to the repair loop. Reject `eslint-plugin-tailwindcss`, which in the lab missed arbitrary properties, `(--var)` and concatenation.
3. **Guardrails that come with it:** props on layout primitives typed as token unions (registry gate); tailwind-merge either skipped or configured with our token groups; a fixture file of planted violations kept as a test for the lint config itself, so a plugin upgrade can't quietly open a hole.

Why not CSS modules: it has the smaller lint surface and zero dependencies. But generated screens become two files, class names are agent-invented and typos are silent under Vite's type shim, and there is no compiled closed vocabulary to point the repair loop at. Choose it only if #9 decides fewer moving parts matters more than the class-level gate signal.

## Appendix: lab configs (verbatim, trimmed)

`eslint.config.mjs` (option A):

```js
import { defineConfig } from "eslint/config";
import tseslint from "typescript-eslint";
import css from "@eslint/css";
import { tailwind4 } from "tailwind-csstree";
import betterTailwind from "eslint-plugin-better-tailwindcss";
import noRawCssValues from "./lint/no-raw-css-values.mjs";

export default defineConfig([
  {
    files: ["src/**/*.tsx"],
    languageOptions: { parser: tseslint.parser, parserOptions: { ecmaFeatures: { jsx: true } } },
    plugins: { "better-tailwindcss": betterTailwind },
    settings: { "better-tailwindcss": { entryPoint: "src/theme.css" } },
    rules: {
      "no-restricted-syntax": ["error",
        { selector: "JSXAttribute[name.name='style']", message: "No inline styles. Use library props or token classes." },
        { selector: "JSXAttribute[name.name=/^(fill|stroke|color|stopColor)$/] > Literal[value=/^(#|rgb|hsl|oklch)/]",
          message: "Raw colour in SVG attribute. Use currentColor or a token class." },
      ],
      "no-restricted-imports": ["error", { patterns: [
        { regex: "^@acme/ui/.+", message: "Import from the library barrel '@acme/ui' only." },
        { group: ["@radix-ui/*", "radix-ui"], message: "Radix is wrapped by the library; import from '@acme/ui'." },
      ] }],
      "better-tailwindcss/no-unknown-classes": "error",
      "better-tailwindcss/no-concatenated-classes": "error",
      "better-tailwindcss/no-restricted-classes": ["error", { restrict: [
        { pattern: "\\[([^\\[\\]]*?)\\](?!:)", message: "Arbitrary value '$1' bypasses the token scale. Use a token class." },
        { pattern: "-\\(((?:[a-z-]+:)?--[^)]*)\\)$", message: "CSS-variable shorthand '($1)' bypasses the token scale. Use a token class." },
        { pattern: "^(?:[^:]*:)*-?(duration|delay|z|opacity)-(\\d+)$", message: "'$1-$2' is a raw number, not a token. Use the named $1 token." },
      ] }],
    },
  },
  {
    files: ["src/**/*.css"],
    plugins: { css, local: { rules: { "no-raw-css-values": noRawCssValues } } },
    language: "css/css",
    languageOptions: { customSyntax: tailwind4 },
    rules: { "local/no-raw-css-values": "error", "css/no-important": "error" },
  },
  { ignores: ["src/theme.css"] }, // the token source itself is allowed raw values
]);
```

`lint/no-raw-css-values.mjs` (custom rule for the `css/css` language):

```js
const GOVERNED =
  /^(color|background(-color)?|border(-\w+)*-color|fill|stroke|outline-color|padding.*|margin.*|gap|row-gap|column-gap|inset.*|top|right|bottom|left|border(-\w+)*-radius|font(-family|-size|-weight)?|line-height|letter-spacing|box-shadow|transition.*|animation.*)$/;
const COLOR_FNS = new Set(["rgb", "rgba", "hsl", "hsla", "oklch", "oklab", "lab", "lch", "color", "hwb"]);

export default {
  meta: { type: "problem", language: "css/css",
    messages: { raw: "Raw value '{{value}}' in '{{prop}}'. Use a token: var(--ds-…)." } },
  create(context) {
    let prop = null;
    const report = (node, value) => context.report({ node, messageId: "raw", data: { value, prop } });
    return {
      Declaration(node) { prop = node.property.startsWith("--") ? null : node.property; },
      "Declaration:exit"() { prop = null; },
      Hash(node) { if (prop && GOVERNED.test(prop)) report(node, `#${node.value}`); },
      Dimension(node) { if (prop && GOVERNED.test(prop)) report(node, `${node.value}${node.unit}`); },
      Function(node) { if (prop && GOVERNED.test(prop) && COLOR_FNS.has(node.name)) report(node, `${node.name}()`); },
      "Declaration[property=/^font-family$/] Identifier"(node) { report(node, node.name); },
      "Atrule[name='apply']"(node) {
        for (const m of context.sourceCode.getText(node.prelude).matchAll(/\S*\[[^\]]*\]\S*/g))
          context.report({ node, messageId: "raw", data: { value: m[0], prop: "@apply" } });
      },
    };
  },
};
```

Sample output (option A, `Bad.tsx` + `bad.module.css`):

```
1:1   '@acme/ui/src/button/Button' import is restricted… Import from the library barrel '@acme/ui' only   no-restricted-imports
6:21  Arbitrary value '13px' bypasses the token scale. Use a token class                              better-tailwindcss/no-restricted-classes
6:85  Unknown class detected: bg-red-500                                                              better-tailwindcss/no-unknown-classes
8:16  No inline styles. Use library props or token classes                                            no-restricted-syntax
2:10  Raw value '#fff' in 'color'. Use a token: var(--ds-…)                                           local/no-raw-css-values
```

## Sources

- [radix-styling]: Radix Primitives, Styling guide. https://www.radix-ui.com/primitives/docs/guides/styling
- [tw-theme]: Tailwind CSS, Theme variables. https://tailwindcss.com/docs/theme
- [tw-custom]: Tailwind CSS, Adding custom styles (arbitrary values/properties). https://tailwindcss.com/docs/adding-custom-styles
- [tw-detect]: Tailwind CSS, Detecting classes in source files. https://tailwindcss.com/docs/detecting-classes-in-source-files
- [tw-vite]: Tailwind CSS, Installing with Vite. https://tailwindcss.com/docs/installation/using-vite
- [eslint-css]: `@eslint/css` README. https://github.com/eslint/css
- [tw-csstree]: `tailwind-csstree` README. https://github.com/humanwhocodes/tailwind-csstree
- [bt-readme]: `eslint-plugin-better-tailwindcss` README. https://github.com/schoero/eslint-plugin-better-tailwindcss
- [bt-unknown]: `no-unknown-classes`. https://github.com/schoero/eslint-plugin-better-tailwindcss/blob/main/docs/rules/no-unknown-classes.md
- [bt-restricted]: `no-restricted-classes`. https://github.com/schoero/eslint-plugin-better-tailwindcss/blob/main/docs/rules/no-restricted-classes.md
- `no-concatenated-classes`. https://github.com/schoero/eslint-plugin-better-tailwindcss/blob/main/docs/rules/no-concatenated-classes.md
- [tw-plugin]: `eslint-plugin-tailwindcss` README (v4). https://github.com/francoismassart/eslint-plugin-tailwindcss
- [eslint-nrs]: ESLint `no-restricted-syntax`. https://eslint.org/docs/latest/rules/no-restricted-syntax
- [eslint-nri]: ESLint `no-restricted-imports`. https://eslint.org/docs/latest/rules/no-restricted-imports
- [stylelint-dsv]: `stylelint-declaration-strict-value` README. https://github.com/AndyOGo/stylelint-declaration-strict-value
- [stylelint-rules]: Stylelint rules (`color-no-hex`, `function-disallowed-list`). https://stylelint.io/user-guide/rules
- [vite-css]: Vite, Features: CSS Modules. https://vite.dev/guide/features.html#css-modules
- [vite-client-dts]: Vite `client.d.ts` (`CSSModuleClasses`). https://github.com/vitejs/vite/blob/main/packages/vite/client.d.ts
- [sb-vitest]: Storybook, Vitest addon. https://storybook.js.org/docs/writing-tests/integrations/vitest-addon
- [sb-tailwind]: Storybook, Tailwind recipe. https://storybook.js.org/recipes/tailwindcss
- [tw-merge]: `tailwind-merge` README (configuration for custom themes). https://github.com/dcastil/tailwind-merge
- npm registry (`npm view <pkg> version peerDependencies`) for every version and peer range in the table above.

[radix-styling]: https://www.radix-ui.com/primitives/docs/guides/styling
[tw-theme]: https://tailwindcss.com/docs/theme
[tw-custom]: https://tailwindcss.com/docs/adding-custom-styles
[tw-detect]: https://tailwindcss.com/docs/detecting-classes-in-source-files
[tw-vite]: https://tailwindcss.com/docs/installation/using-vite
[eslint-css]: https://github.com/eslint/css
[tw-csstree]: https://github.com/humanwhocodes/tailwind-csstree
[bt-readme]: https://github.com/schoero/eslint-plugin-better-tailwindcss
[bt-unknown]: https://github.com/schoero/eslint-plugin-better-tailwindcss/blob/main/docs/rules/no-unknown-classes.md
[bt-restricted]: https://github.com/schoero/eslint-plugin-better-tailwindcss/blob/main/docs/rules/no-restricted-classes.md
[tw-plugin]: https://github.com/francoismassart/eslint-plugin-tailwindcss
[eslint-nrs]: https://eslint.org/docs/latest/rules/no-restricted-syntax
[eslint-nri]: https://eslint.org/docs/latest/rules/no-restricted-imports
[stylelint-dsv]: https://github.com/AndyOGo/stylelint-declaration-strict-value
[stylelint-rules]: https://stylelint.io/user-guide/rules
[vite-css]: https://vite.dev/guide/features.html#css-modules
[vite-client-dts]: https://github.com/vitejs/vite/blob/main/packages/vite/client.d.ts
[sb-vitest]: https://storybook.js.org/docs/writing-tests/integrations/vitest-addon
[sb-tailwind]: https://storybook.js.org/recipes/tailwindcss
[tw-merge]: https://github.com/dcastil/tailwind-merge
