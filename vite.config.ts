import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  test: {
    environment: "jsdom",
    // Globs skip dot-directories, so .storybook is named on its own.
    include: ["**/*.test.{ts,tsx}", ".storybook/**/*.test.{ts,tsx}"],
    exclude: [
      ...configDefaults.exclude,
      "storybook-static/**",
      "gates/out/**",
      ".agents/**",
      ".claude/**",
    ],
  },
});
