import type { StorybookConfig } from "@storybook/react-vite";

const config: StorybookConfig = {
  stories: [
    "../src/**/*.stories.@(ts|tsx)",
    // The gate's own tests build its fixture stories in (gates/gate.e2e.ts).
    ...(process.env.GATE_FIXTURES ? ["../gates/fixtures/*.stories.tsx"] : []),
  ],
  framework: "@storybook/react-vite",
};

export default config;
