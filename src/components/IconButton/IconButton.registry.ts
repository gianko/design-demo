import { z } from "zod";
import { defineEntry } from "../../registry/entry.ts";
import { iconNames } from "./icons.tsx";

// IconButton has no look variant (one quiet look, PLAN.md); `icon` takes a
// name from the shared icon map, which no tv() variant spells.
export const iconButtonEntry = defineEntry({
  name: "IconButton",
  use: "The close button Sheet renders in its header and Toast beside its copy. For an action a person takes use a Button, which names what happens in words.",
  // Sheet renders it; the spec step never sees it (#212).
  internal: true,
  props: z.object({
    icon: z
      .enum(iconNames)
      .describe("What the button does, from the icon map: close."),
    label: z
      .string()
      .describe(
        "What pressing it does, read by screen readers and not shown, such as Close invoice details."
      ),
    disabled: z
      .boolean()
      .optional()
      .describe("It can't be pressed now; the button leaves the tab order."),
  }),
});
