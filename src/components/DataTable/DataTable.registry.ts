import { z } from "zod";
import { defineEntry } from "../../registry/entry.ts";

// DataTable has no look variant (one table, PLAN.md), so nothing reads its
// tv() config. Its columns are its cell slot's nodes, in order, each named by
// the header at the same place in `columns`; its detail slot holds the Sheet
// a row opens (ADR 0011); its actions slot is its footer, holding the Buttons
// that act on the Selection, and having one makes the table selectable
// (ADR 0013).
export const dataTableEntry = defineEntry({
  name: "DataTable",
  use: "The screen's list of invoices or payments, one row per item: bind rows to a fixtures list, name each column in columns, and put one node per column in cell, in the same order, with its props bound to row.* (such as row.number). When an action acts on the Selection, the rows the person ticks, put its Button in actions, the table's footer, and give selectionText; only a table with actions is selectable, its rows and header getting checkboxes, and one without has neither checkboxes nor a footer. The footer is always shown, saying how many rows are ticked, its Buttons disabled until a row is. The selection is the table's own, not a screen state, so declare none for it: an action that succeeds clears it, and one that fails keeps it. To let a row open its details, put one Sheet in detail, its children bound to row.*: clicking a row or pressing Enter on it opens that row's Sheet. A table can have actions and a detail Sheet at once; ticking selects, and clicking the row opens it. Never put a DataTable inside a Card; for the facts of one invoice shown on the screen itself use a Card.",
  surface: "flat",
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
    selectionText: z
      .object({
        none: z
          .string()
          .min(1)
          .describe("With no row ticked, such as No invoices selected."),
        one: z
          .string()
          .min(1)
          .describe("With one row ticked, such as 1 invoice selected."),
        other: z
          .string()
          .min(1)
          .describe(
            "With more rows ticked, holding {count}, which the library replaces with the number: {count} invoices selected."
          ),
      })
      .optional()
      .describe(
        "The footer's selected count, in sentence case, in three forms; required when the table has actions, left out otherwise."
      ),
  }),
  slots: {
    cell: { allow: ["Text", "Amount", "StatusTag"] },
    detail: { allow: ["Sheet"] },
    actions: { allow: ["Button"] },
  },
});
