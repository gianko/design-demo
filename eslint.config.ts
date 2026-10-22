import js from "@eslint/js";
import { defineConfig, globalIgnores } from "eslint/config";
import tseslint from "typescript-eslint";
import { generatorOutput, tokenLint } from "./lint/token/config.ts";

export default defineConfig([
  globalIgnores([
    "storybook-static/",
    "gates/out/",
    ".agents/",
    ".claude/",
    ...generatorOutput,
    // Planted violations, linted by their own test at the path they plant.
    "lint/token/fixtures/",
  ]),
  {
    // Kept off CSS, which ESLint lints too (gate 2).
    files: ["**/*.{js,mjs,cjs,ts,mts,cts,tsx}"],
    extends: [js.configs.recommended, tseslint.configs.recommended],
  },
  // Gate 2.
  tokenLint,
]);
