import type { StorybookConfig } from "@storybook/react-vite";

const config: StorybookConfig = {
  // The generator's render pass builds one generated screen's stories alone
  // (generator/render-gates.ts), a glob relative to this directory.
  stories: process.env.GATE_STORIES
    ? [process.env.GATE_STORIES]
    : [
        "../src/**/*.stories.@(ts|tsx)",
        // The gate's own tests build its fixture stories in (gates/gate.e2e.ts).
        ...(process.env.GATE_FIXTURES
          ? ["../gates/fixtures/*.stories.tsx"]
          : []),
      ],
  framework: "@storybook/react-vite",
};

export default config;
