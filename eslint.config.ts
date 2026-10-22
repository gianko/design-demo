import js from "@eslint/js";
import { defineConfig, globalIgnores } from "eslint/config";
import tseslint from "typescript-eslint";
import { tasteConfigs } from "./lint/taste/plugin.ts";

export default defineConfig([
  globalIgnores(["storybook-static/", "gates/out/", ".agents/", ".claude/"]),
  // Scoped to scripts, so CSS (linted as css/css) doesn't get JS rules.
  {
    files: ["**/*.{js,mjs,cjs,ts,mts,cts,tsx}"],
    extends: [js.configs.recommended, tseslint.configs.recommended],
  },
  // Taste lint's static rules (gate 7).
  tasteConfigs,
]);
