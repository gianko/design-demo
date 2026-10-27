import { z } from "zod";
import { defineEntry } from "../../registry/entry.ts";

// DataTable has no look variant (one table, PLAN.md), so nothing reads its
// tv() config. Its columns are its cell slot's nodes, in order, each named by
// the header at the same place in `columns`; its detail slot holds the Sheet
// a row opens (ADR 0011).
export const dataTableEntry = defineEntry({
  name: "DataTable",
  use: "The screen's list of invoices or payments, one row per item: bind rows to a fixtures list, name each column in columns, and put one node per column in cell, in the same order, with its props bound to row.* (such as row.number). Turn selectable on only when an action acts on the Selection, the rows the person ticks; leave it off otherwise, and the table has no checkboxes. In a selectable table, ticking rows enters rows-selected and unticking the last returns to the default state; an action that succeeds clears the selection, and one that fails keeps it. To let a row open its details, put one Sheet in detail, its children bound to row.*: clicking a row or pressing Enter on it opens that row's Sheet. A table can be selectable and have a detail Sheet at once; ticking selects, and clicking the row opens it. For the facts of one invoice shown on the screen itself use a Card.",
  props: z.object({
    rows: z
      .array(z.looseObject({ id: z.string() }))
      .describe(
        "The items, one row each, bound to a fixtures list such as invoices; each has an id."
      ),
    columns: z
      .array(z.string().min(1))
      .min(1)
      .describe(
        "Each column's header, in sentence case, in the order of the cell slot's nodes, such as Due."
      ),
    selectable: z
      .boolean()
      .optional()
      .describe(
        "Puts a checkbox on each row, and one in the header, to tick rows into the Selection; true only when an action acts on the selected rows, left out otherwise."
      ),
  }),
  slots: {
    cell: { allow: ["Text", "Amount", "StatusTag"] },
    detail: { allow: ["Sheet"] },
  },
});
