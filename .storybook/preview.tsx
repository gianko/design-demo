import type { Preview } from "@storybook/react-vite";
import { ScreenHost, type ScreenStateParameters } from "../src/index.ts";
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
  // The first decorator is the innermost.
  decorators: [
    // A generated screen reads its state and data through the library's
    // hooks (ADR 0011), so every story renders inside a ScreenHost. A state
    // story names its state and fixture variant in `parameters.screenState`
    // (generator/screen-stories.ts); the rest start in the default state.
    // A kept screen's stories also carry its declared states in
    // `parameters.screenStates`, so a confirmed action shows the data of the
    // state it enters.
    (Story, { parameters }) => (
      <ScreenHost
        screenState={(parameters as ScreenStateParameters).screenState}
        states={(parameters as ScreenStateParameters).screenStates}
      >
        <Story />
      </ScreenHost>
    ),
    // Theme and density are CSS scopes, so this sets the two attributes. It
    // also paints the page, as whatever hosts a screen does, so a component
    // with no surface of its own sits on the page role, not on the browser's
    // white.
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
