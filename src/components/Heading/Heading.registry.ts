import { z } from "zod";
import { defineEntry, variantNumbers } from "../../registry/entry.ts";
import { heading } from "./Heading.tsx";

export const headingEntry = defineEntry({
  name: "Heading",
  use: "The title of a screen or one of its sections: level 1 once per screen for what it is about, level 2 for each section under it, level 3 for a group inside a section, never skipping a level. For copy use Text, for money Amount, for a status StatusTag.",
  props: z.object({
    text: z.string().describe("The title, in sentence case."),
    level: variantNumbers(heading, "level").describe(
      "1 for the screen's one title, 2 for a section, 3 for a group inside a section; each level sits directly under the one above it."
    ),
  }),
});
