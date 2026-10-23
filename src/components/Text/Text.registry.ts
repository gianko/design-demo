import { z } from "zod";
import { defineEntry, variantEnum } from "../../registry/entry.ts";
import { text } from "./Text.tsx";

export const textEntry = defineEntry({
  name: "Text",
  use: "A sentence or short paragraph of plain copy, or a caption-sized note under something; set live on the Text that confirms an action's result in the state the action enters. For a title use Heading, for money Amount, for a status StatusTag.",
  props: z.object({
    text: z.string().describe("The copy, in sentence case."),
    size: variantEnum(text, "size")
      .optional()
      .describe(
        "body (the default) for copy; caption for a short note under something."
      ),
    tone: variantEnum(text, "tone")
      .optional()
      .describe(
        "default (the default) for copy the reader needs; muted for secondary detail."
      ),
    live: z
      .boolean()
      .optional()
      .describe(
        "Announces the copy politely to screen readers; only on the Text that confirms an action's result."
      ),
  }),
});
