import { z } from "zod";
import { defineEntry } from "../../registry/entry.ts";

// PageHeader has no variants (one look, PLAN.md), so nothing reads its tv()
// config; its slots are the whole of what a UI spec gives it.
export const pageHeaderEntry = defineEntry({
  name: "PageHeader",
  use: "The top of a screen, once and first: the screen's level 1 Heading in title, an optional line of context under it in description (such as a date), and the screen's own Buttons in actions, at the end of the row. For a section's title use a Heading alone; an action about one invoice goes in its Card's footer.",
  props: z.object({}),
  slots: {
    title: { allow: ["Heading"] },
    description: { allow: ["Text", "Stack"] },
    actions: { allow: ["Button"] },
  },
});
