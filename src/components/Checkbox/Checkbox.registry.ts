import { z } from "zod";
import { defineEntry } from "../../registry/entry.ts";

// Checkbox has no look variant (one row selector, PLAN.md); `checked` takes
// the WAI-ARIA values, a boolean or "mixed", which no tv() enum can spell.
export const checkboxEntry = defineEntry({
  name: "Checkbox",
  use: "The row selector DataTable renders, one per row and one in its header. To act on selected rows use a Button, for a status StatusTag.",
  // DataTable renders it; the spec step never sees it (#179).
  internal: true,
  props: z.object({
    label: z
      .string()
      .describe(
        "What ticking it selects, read by screen readers and not shown, such as Select INV-0142."
      ),
    checked: z
      .union([z.boolean(), z.literal("mixed")])
      .optional()
      .describe(
        'true when selected; "mixed" on the header when only some rows are.'
      ),
    disabled: z
      .boolean()
      .optional()
      .describe(
        "This row can't be selected now; the checkbox leaves the tab order."
      ),
    locked: z
      .boolean()
      .optional()
      .describe(
        "The selection is held while an action on it runs: ticking does nothing, but the checkbox keeps its look and its place in the tab order."
      ),
  }),
});
