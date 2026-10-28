import { z } from "zod";
import { defineEntry, variantEnum } from "../../registry/entry.ts";
import { toast } from "./toast.ts";

export const toastEntry = defineEntry({
  name: "Toast",
  use: "The live result of an action; only in a state an action enters. Put it last in the Screen, in the state its action enters: tone success in the action's to.success state, tone failure in to.failure. One per state; it announces itself, so the state needs no live Text. For copy that shows whatever happened use Text.",
  surface: "raised",
  props: z.object({
    text: z
      .string()
      .describe(
        "What the action did, in sentence case; a failure says what happened and what to do next."
      ),
    tone: variantEnum(toast, "tone").describe(
      "success in the state a confirmed action enters; failure in the state a failed one enters."
    ),
  }),
});
