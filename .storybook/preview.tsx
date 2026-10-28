import type { Preview } from "@storybook/react-vite";
import {
  openDetailAttribute,
  tickRowsAttribute,
} from "../src/components/DataTable/DataTable.tsx";
import { ScreenHost, type ScreenStateParameters } from "../src/index.ts";
import "../src/styles.css";
import { densities, themes, type Density, type Theme } from "./globals";
import {
  actionStart,
  type ScreenActionGlobals,
  type ScreenActionParameters,
} from "./screen-actions.ts";

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
    // No toolbar: the action-transitions taste rule sets these in the URL
    // (./screen-actions.ts).
    screenAction: { description: "Declared action to start before" },
    screenOutcome: { description: "Its outcome: success or failure" },
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
    // The screenAction and screenOutcome globals start it where one of its
    // declared actions is clicked, settling under that outcome's variant. A
    // kept screen's stories also carry its declared states in
    // `parameters.screenStates`, so a confirmed action shows the data of the
    // state it enters. A screen's open-sheet story names in
    // `parameters.openSheet` which detail table starts with its first row's
    // Sheet open (ADR 0011), and its rows-ticked story in
    // `parameters.tickRows` which table with actions starts with every row
    // ticked (ADR 0013), as an action clicked in a table's footer does too;
    // DataTable reads each from its test attribute on a box-less element
    // around the story.
    (Story, { parameters, globals }) => {
      const { screenState, screenStates, openSheet, tickRows } =
        parameters as ScreenStateParameters;
      const { tickRows: ticked = tickRows, ...start } = actionStart(
        parameters as ScreenActionParameters & ScreenStateParameters,
        globals as ScreenActionGlobals
      ) ?? { screenState };
      const attributes = {
        ...(openSheet !== undefined && { [openDetailAttribute]: openSheet }),
        ...(ticked !== undefined && { [tickRowsAttribute]: ticked }),
      };
      return (
        <ScreenHost {...start} states={screenStates}>
          {Object.keys(attributes).length === 0 ? (
            <Story />
          ) : (
            <div className="contents" {...attributes}>
              <Story />
            </div>
          )}
        </ScreenHost>
      );
    },
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
