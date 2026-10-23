// The static half of taste lint (gate 7): an ESLint plugin whose rules run as
// `taste/<rule>` on TSX and CSS. The render half is gates/render-rules.ts.
// Rule options come from lint/taste/config.ts, the one place exemptions live.

import css from "@eslint/css";
import type { ESLint, Linter } from "eslint";
import { tailwind4 } from "tailwind-csstree";
import { config } from "./config.ts";
import { noInlineDisable } from "./no-inline-disable.ts";
import { staticRules } from "./rules/index.ts";

const plugin: ESLint.Plugin = {
  meta: { name: "taste" },
  rules: Object.fromEntries(staticRules.map((rule) => [rule.id, rule.lint])),
};

// Not a taste rule but what keeps taste rules from being suppressed inline,
// so it sits outside `taste/*`.
const exemptions: ESLint.Plugin = {
  meta: { name: "taste-exemptions" },
  rules: { "no-inline-disable": noInlineDisable },
};

const plugins = { taste: plugin, "taste-exemptions": exemptions };

// Every rule is an error, with its config as its options when it has one.
const options: Partial<Record<string, unknown>> = config;
const rules: Linter.RulesRecord = {
  ...Object.fromEntries(
    staticRules.map(({ id }) => [
      `taste/${id}`,
      options[id] ? ["error", options[id]] : "error",
    ])
  ),
  "taste-exemptions/no-inline-disable": "error",
};

export const tasteConfigs: Linter.Config[] = [
  // The planted violations the rules' own tests lint. The gate's tests lint
  // them too, through GATE_LINT_FIXTURES.
  ...(process.env.GATE_LINT_FIXTURES
    ? []
    : [{ ignores: ["lint/taste/fixtures/"] }]),
  // TSX and CSS, as RULES.md says: that's where classes and motion are
  // written, and plain TS is full of strings that only look like classes.
  { files: ["**/*.tsx"], plugins, rules },
  {
    files: ["**/*.css"],
    plugins: { css, ...plugins },
    language: "css/css",
    languageOptions: { customSyntax: tailwind4 },
    rules,
  },
];
