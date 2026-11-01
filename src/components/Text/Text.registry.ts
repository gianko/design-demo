import { z } from "zod";
import { defineEntry, variantEnum } from "../../registry/entry.ts";
import { text } from "./Text.tsx";

export const textEntry = defineEntry({
  name: "Text",
  use: "A sentence or short paragraph of plain copy, or a caption-sized note under something. For a title use Heading, for money Amount, for a status StatusTag. An action's result is a Notice or a Toast, never a Text.",
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
        "Announces the copy politely to screen readers. Leave it unset: an action's result is a Notice or a Toast, which announce themselves."
      ),
  }),
});
