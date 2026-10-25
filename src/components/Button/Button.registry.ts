import { z } from "zod";
import { defineEntry, variantEnum } from "../../registry/entry.ts";
import { button } from "./Button.tsx";

export const buttonEntry = defineEntry({
  name: "Button",
  use: "An action the person takes, labelled with what happens (Send reminder, Approve and pay); give it action when it runs a declared action, and make it that action's pending node. primary for the screen's one main action, secondary beside it, quiet for a minor one. For a status use StatusTag, for copy Text.",
  props: z.object({
    text: z
      .string()
      .describe(
        "The label: a verb for what happens, in sentence case, with no arrow or ending punctuation."
      ),
    intent: variantEnum(button, "intent").describe(
      "primary for the screen's one main action, in the accent; secondary for an action beside it; quiet for a minor one."
    ),
    disabled: z
      .boolean()
      .optional()
      .describe(
        "The action can't run now; the button leaves the tab order. Leave it out unless the screen brief asks."
      ),
    pending: z
      .boolean()
      .optional()
      .describe("The running action's pending, from useAction."),
  }),
  // The code step sets pending from useAction (ADR 0011); the UI spec names
  // the pending node through actions[].pending instead.
  codeOnly: ["pending"],
});
