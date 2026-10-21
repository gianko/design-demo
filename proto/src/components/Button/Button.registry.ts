import { z } from "zod";
import { button, icons } from "./Button";

const keys = <T extends object>(o: T) => Object.keys(o) as [keyof T & string, ...(keyof T & string)[]];

export const buttonEntry = {
  name: "Button",
  use: "The action a person takes from here (approve, pay, save, send): primary for the one main action on a screen or bar, secondary for the rest; not for navigation or filters.",
  // Button takes no child nodes: its text is the `label` prop and its icon is a name.
  slots: [] as const,
  props: z.object({
    label: z.string().min(1).describe("Verb-first, sentence case, says what happens: \"Approve and pay\"."),
    intent: z.enum(keys(button.variants.intent)).optional(),
    icon: z.enum(keys(icons)).optional().describe("Leading icon, only where it makes the action quicker to recognise."),
    pending: z.boolean().optional().describe("True while the action's operation runs; shows the progress edge."),
    disabled: z.boolean().optional(),
    type: z.enum(["button", "submit"]).optional(),
  }),
};

export type ButtonProps = z.infer<typeof buttonEntry.props>;
