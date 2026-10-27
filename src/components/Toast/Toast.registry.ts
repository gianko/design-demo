import { z } from "zod";
import { defineEntry, variantEnum } from "../../registry/entry.ts";
import { toast } from "./toast.ts";

export const toastEntry = defineEntry({
  name: "Toast",
  use: "The live result of an action; only in a state an action enters. Tone success in the action's to.success state, placed where its ActionBar was (right after the DataTable) and with that bar left out, so the bar becomes the toast; tone failure in to.failure, placed right before the ActionBar, which stays for a retry. One per state; it announces itself, so the state needs no live Text. For copy that shows whatever happened use Text.",
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
