import { z } from "zod";
import { defineEntry } from "../../registry/entry.ts";

// Sheet has no variants (one overlay panel, PLAN.md), so nothing reads its
// tv() config; its slots and its close button's name are the whole of what a
// UI spec gives it. The body's allow-list is what keeps it read-only: no
// Card (a painted surface inside a painted surface) and no Button.
export const sheetEntry = defineEntry({
  name: "Sheet",
  use: "Row detail; only in a DataTable's `detail` slot. Clicking a row or pressing Enter on it opens that row's Sheet: put a level 2 Heading bound to the row in title (such as row.number), and in body the row's amount and status first, then only the facts the table's columns don't show, as Text, Amount, StatusTag and Stack, with props bound to row.*. It is read-only, so it holds no Button and no Card; it renders its own close button and closes on Escape or a click on the scrim. For the facts of one thing shown on the screen itself use a Card.",
  surface: "overlay",
  props: z.object({
    closeLabel: z
      .string()
      .describe(
        "What its close button closes, read by screen readers and not shown, such as Close invoice details."
      ),
  }),
  slots: {
    title: { allow: ["Heading"] },
    body: { allow: ["Heading", "Text", "Amount", "StatusTag", "Stack"] },
  },
});
