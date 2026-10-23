import js from "@eslint/js";
import { defineConfig, globalIgnores } from "eslint/config";
import tseslint from "typescript-eslint";

export default defineConfig([
  globalIgnores([
    "storybook-static/",
    "gates/out/",
    ".agents/",
    ".claude/",
    ".scratch/",
  ]),
  js.configs.recommended,
  tseslint.configs.recommended,
]);
