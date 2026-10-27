import { z } from "zod";
import { defineEntry } from "../../registry/entry.ts";

// EmptyState has no variants (one look, PLAN.md), so nothing reads its tv()
// config; its two lines of copy are the whole of what a UI spec gives it.
export const emptyStateEntry = defineEntry({
  name: "EmptyState",
  use: "What a list shows in its empty screen state: title says why the list is empty, and text, where it helps, what will appear there and when. Put it where the DataTable goes, shown when: [empty], with the DataTable left out of that state and the PageHeader kept; never inside a Card. For copy that shows whatever the data use Text; for an action's result Toast.",
  props: z.object({
    title: z
      .string()
      .describe(
        "Why the list is empty, in sentence case, such as No invoices to pay."
      ),
    text: z
      .string()
      .optional()
      .describe(
        "What will appear here and when, in sentence case; left out when the title says it all."
      ),
  }),
});
