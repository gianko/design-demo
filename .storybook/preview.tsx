import type { Preview } from "@storybook/react-vite";
import "../src/styles.css";
import { densities, themes, type Density, type Theme } from "./globals";

const preview: Preview = {
  globalTypes: {
    theme: {
      description: "Theme",
      toolbar: { title: "Theme", items: [...themes], dynamicTitle: true },
    },
    density: {
      description: "Density set",
      toolbar: { title: "Density", items: [...densities], dynamicTitle: true },
    },
  },
  initialGlobals: {
    theme: "light" satisfies Theme,
    density: "admin" satisfies Density,
  },
  // Theme and density are CSS scopes, so a story only needs the two attributes.
  // The wrapper paints the page, as whatever hosts a screen does, so a
  // component with no surface of its own sits on the page role, not on the
  // browser's white.
  decorators: [
    (Story, { globals }) => (
      <div
        className="bg-page"
        data-theme={globals.theme}
        data-density={globals.density}
      >
        <Story />
      </div>
    ),
  ],
};

export default preview;
