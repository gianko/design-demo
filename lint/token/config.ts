// Gate 2, token lint (ADR 0002): ESLint only, in three layers. Core rules
// (no `style`, no raw SVG colours, imports only through the library barrel,
// no Radix outside the library), eslint-plugin-better-tailwindcss for classes,
// and @eslint/css with our own rule for CSS. Generated screens also contain no
// intrinsic JSX elements (ADR 0004).

import css from "@eslint/css";
import betterTailwind from "eslint-plugin-better-tailwindcss";
import type { Linter } from "eslint";
import { tailwind4 } from "tailwind-csstree";
import { noRawCssValues } from "./no-raw-css-values.ts";
import { restrictedClasses } from "./restricted-classes.ts";

// Generator output (ADR 0010): `pnpm lint` ignores this scratch, and the
// generator lints it with ignores off, so these rules still reach it.
export const generatorOutput = [".generated/", "evals/runs/"];
const generated = generatorOutput.map((dir) => `${dir}**/*.tsx`);

const svgColour = [
  "fill",
  "stroke",
  "color",
  "stopColor",
  "floodColor",
  "lightingColor",
  "stop-color",
  "flood-color",
  "lighting-color",
].join("|");

const noRawStyles = [
  {
    selector: "JSXAttribute[name.name='style']",
    message: "No inline styles (ADR 0002). Use library props or token classes.",
  },
  {
    // Anything but a keyword or a gradient reference, even a variable that
    // might hold a token.
    selector: `JSXOpeningElement[name.name=/^[a-z]/] > JSXAttribute[name.name=/^(${svgColour})$/]:not([value.type='Literal'][value.value=/^(currentColor|none|inherit|url\\(#[\\w-]+\\))$/])`,
    message:
      "Raw colour in an SVG attribute. Use currentColor and a token class.",
  },
];

const noIntrinsicElements = [
  {
    selector: "JSXOpeningElement[name.name=/^[a-z]/]",
    message:
      "A generated screen has no intrinsic elements (ADR 0004). Use a library component.",
  },
  {
    selector: "JSXOpeningElement[name.type='JSXNamespacedName']",
    message:
      "A generated screen has no intrinsic elements (ADR 0004). Use a library component.",
  },
  {
    selector:
      "CallExpression:matches([callee.name='createElement'], [callee.property.name='createElement'])[arguments.0.type='Literal']",
    message:
      "A generated screen has no intrinsic elements (ADR 0004). Use a library component.",
  },
];

const radix = {
  group: ["radix-ui", "radix-ui/*", "@radix-ui/*"],
  message:
    "Radix is wrapped by the library (ADR 0002). Import from the library barrel.",
};

// A relative import that isn't the barrel: `../../index.ts` passes, and
// `../../amount/Amount.tsx` or `./Local.tsx` fails.
const pastTheBarrel = {
  regex: String.raw`^\.{1,2}/(?!(?:\.\./)*(?:index(?:\.ts)?)?$)`,
  message:
    "A screen imports the library through its barrel only (ADR 0002): src/index.ts.",
};

export const tokenLint: Linter.Config[] = [
  {
    name: "token-lint/tsx",
    files: ["src/**/*.{ts,tsx}", ...generated],
    plugins: { "better-tailwindcss": betterTailwind },
    // The allowlist is the compiled theme, so it can't drift from the tokens.
    settings: { "better-tailwindcss": { entryPoint: "src/styles.css" } },
    rules: {
      "no-restricted-syntax": ["error", ...noRawStyles],
      "better-tailwindcss/no-unknown-classes": "error",
      "better-tailwindcss/no-restricted-classes": [
        "error",
        { restrict: restrictedClasses },
      ],
      "better-tailwindcss/no-concatenated-classes": "error",
    },
  },
  {
    // Kept screens and generator output. A kept screen's stories are written
    // by `pnpm keep`, not the generator, and import the screen beside them.
    name: "token-lint/screens",
    files: ["src/screens/**/*.tsx", ...generated],
    ignores: ["**/*.stories.tsx"],
    rules: {
      "no-restricted-syntax": ["error", ...noRawStyles, ...noIntrinsicElements],
      "no-restricted-imports": ["error", { patterns: [radix, pastTheBarrel] }],
    },
  },
  {
    // `tokens/` is the token source, the one place raw values belong.
    name: "token-lint/css",
    files: ["**/*.css"],
    ignores: ["tokens/**"],
    language: "css/css",
    languageOptions: { customSyntax: tailwind4 },
    plugins: { css, token: { rules: { "no-raw-css-values": noRawCssValues } } },
    rules: { "token/no-raw-css-values": "error" },
  },
];
