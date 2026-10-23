import { z } from "zod";
import { defineEntry, variantEnum } from "../../registry/entry.ts";
import { screen } from "./Screen.tsx";

export const screenEntry = defineEntry({
  name: "Screen",
  use: "The root of every screen, exactly once and never nested: set audience from the screen brief and put the content in body, wrapped in a Stack when there is more than one child.",
  props: z.object({
    audience: variantEnum(screen, "audience").describe(
      "Who the screen is for: admin gets working density, contractor gets full room."
    ),
  }),
  slots: { body: {} },
});
