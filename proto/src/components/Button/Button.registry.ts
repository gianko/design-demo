import { z } from "zod";
import { button } from "./Button";

type Intent = keyof typeof button.variants.intent;

export const buttonRegistry = {
  name: "Button",
  use: "A labelled action the user starts: `primary` for the one action a screen or bar exists for, `secondary` for every other action beside it; use IconButton when there is no room for a label, and a link when it only goes somewhere.",
  slots: [],
  props: z.object({
    intent: z
      .enum(Object.keys(button.variants.intent) as [Intent, ...Intent[]])
      .optional()
      .describe("Defaults to primary. At most one primary per screen or bar."),
    label: z.string().min(1).describe("What happens when pressed, in sentence case: \"Approve and pay\", not \"Submit\"."),
    disabled: z.boolean().optional().describe("Defaults to false. Prefer an enabled button that explains on press."),
    pending: z.boolean().optional().describe("Defaults to false. True while the action's operation runs; the button can't be pressed again."),
    pendingLabel: z
      .string()
      .min(1)
      .optional()
      .describe("Shown while pending: what is happening, never the result (\"Paying 3 invoices\", not \"Paid\")."),
  }),
} as const;

export type ButtonRegistryProps = z.infer<typeof buttonRegistry.props>;
