import js from "@eslint/js";
import { defineConfig, globalIgnores } from "eslint/config";
import tseslint from "typescript-eslint";
import { tasteConfigs } from "./lint/taste/plugin.ts";
import { generatorOutput, tokenLint } from "./lint/token/config.ts";

export default defineConfig([
  globalIgnores([
    "storybook-static/",
    "gates/out/",
    "figma/out/",
    ".agents/",
    ".claude/",
    ".scratch/",
    ...generatorOutput,
    // Planted violations. Their own tests lint them with ignores off, and
    // the gate's e2e plants copies where `pnpm lint` looks.
    "lint/token/fixtures/",
    "lint/taste/fixtures/",
  ]),
  {
    // Kept off CSS, which ESLint lints too (gate 2).
    files: ["**/*.{js,mjs,cjs,ts,mts,cts,tsx}"],
    extends: [js.configs.recommended, tseslint.configs.recommended],
  },
  // Gate 2.
  tokenLint,
  // Taste lint's static rules (gate 7).
  tasteConfigs,
]);
