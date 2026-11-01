import { z } from "zod";
import { defineEntry, variantEnum } from "../../registry/entry.ts";
import { notice } from "./notice.ts";

export const noticeEntry = defineEntry({
  name: "Notice",
  use: "The result of an action on the Card that holds the action's Button: put it in that Card's result slot, in the state the action enters, tone success in the action's to.success state and tone failure in to.failure. It announces itself, so the state needs no live Text. A table's result, or one whose Card has left in the state the action enters, is a Toast.",
  props: z.object({
    text: z
      .string()
      .describe(
        "What the action did, in sentence case; a failure says what happened and what to do next."
      ),
    tone: variantEnum(notice, "tone").describe(
      "success in the state a confirmed action enters; failure in the state a failed one enters."
    ),
  }),
});
