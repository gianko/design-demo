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
  // A library component's Docs page, from its registry entry
  // (./registry-docs.tsx).
  addons: ["@storybook/addon-docs"],
  // The props table is the registry's, so docgen, which can't follow
  // PropsOf to a component's props type anyway, would only reorder it.
  typescript: { reactDocgen: false },
};

export default config;
