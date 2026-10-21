import type { Preview } from "@storybook/react-vite";
import "../src/styles.css";

const preview: Preview = {
  globalTypes: {
    theme: { toolbar: { title: "Theme", items: ["light", "dark"] } },
    density: { toolbar: { title: "Density", items: ["admin", "contractor"] } },
  },
  initialGlobals: { theme: "light", density: "admin" },
  decorators: [
    (Story, { globals }) => {
      document.documentElement.dataset.theme = globals.theme;
      document.documentElement.dataset.density = globals.density;
      return <Story />;
    },
  ],
  parameters: { a11y: { test: "error" }, layout: "padded" },
};
export default preview;
