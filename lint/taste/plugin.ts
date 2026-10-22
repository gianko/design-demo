// The static half of taste lint (gate 7): an ESLint plugin whose rules run as
// `taste/<rule>` on TSX and CSS. The render half is gates/render-rules.ts.
// Rule options come from lint/taste/config.ts, the one place exemptions live.

import css from "@eslint/css";
import type { ESLint, Linter } from "eslint";
import { tailwind4 } from "tailwind-csstree";
import { config } from "./config.ts";
import * as motionTokens from "./rules/motion-tokens.ts";
import * as noPill from "./rules/no-pill.ts";

const plugin: ESLint.Plugin = {
  meta: { name: "taste" },
  rules: { [noPill.id]: noPill.lint, [motionTokens.id]: motionTokens.lint },
};

const rules: Linter.RulesRecord = {
  "taste/no-pill": ["error", config["no-pill"]],
  "taste/motion-tokens": "error",
};

export const tasteConfigs: Linter.Config[] = [
  // The planted violations the rules' own tests lint. The gate's tests lint
  // them too, through GATE_LINT_FIXTURES.
  ...(process.env.GATE_LINT_FIXTURES
    ? []
    : [{ ignores: ["lint/taste/fixtures/"] }]),
  // TSX and CSS, as RULES.md says: that's where classes and motion are
  // written, and plain TS is full of strings that only look like classes.
  { files: ["**/*.tsx"], plugins: { taste: plugin }, rules },
  {
    files: ["**/*.css"],
    plugins: { css, taste: plugin },
    language: "css/css",
    languageOptions: { customSyntax: tailwind4 },
    rules,
  },
];
