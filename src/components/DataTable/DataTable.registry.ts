import { z } from "zod";
import { defineEntry } from "../../registry/entry.ts";

// DataTable has no look variant (one table, PLAN.md), so nothing reads its
// tv() config. Its columns are its cell slot's nodes, in order, each named by
// the header at the same place in `columns`.
export const dataTableEntry = defineEntry({
  name: "DataTable",
  use: "The screen's list of invoices or payments, one row per item, each with a checkbox to select it: bind rows to a fixtures list, name each column in columns, and put one node per column in cell, in the same order, with its props bound to row.* (such as row.number). Ticking rows enters rows-selected and unticking the last returns to the default state; an action that succeeds clears the selection, and one that fails keeps it. For the facts of one invoice use a Card.",
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
  }),
  slots: { cell: { allow: ["Text", "Amount", "StatusTag"] } },
});
