import type { Preview } from "@storybook/react-vite";
import type { VariantName } from "../src/fixtures/fixtures.ts";
import { ScreenHost } from "../src/index.ts";
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
    // A generated screen reads its state through the library's hooks
    // (ADR 0011), so every story renders inside a ScreenHost. A state story
    // names its state and fixture variant in `parameters.screenState`
    // (generator/screen-stories.ts); the rest start in the default state.
    (Story, { parameters }) => {
      const declared = parameters.screenState as
        { name: string; fixture: VariantName } | undefined;
      return (
        <ScreenHost variant={declared?.fixture} state={declared?.name}>
          <Story />
        </ScreenHost>
      );
    },
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
