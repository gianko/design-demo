import { z } from "zod";
import { defineEntry } from "../../registry/entry.ts";

// Card has no variants (one flat look, PLAN.md), so nothing reads its tv()
// config; its slots are the whole of what a UI spec gives it.
export const cardEntry = defineEntry({
  name: "Card",
  use: "A flat surface grouping the facts about one thing, such as an invoice or a payment: its title in header (a Heading, in a row with its StatusTag when it has one), its content in body, its action's Button in footer, and that action's result, a Notice, in result, in each state the action enters. Never put a Card inside a Card. For layout without a surface use Stack.",
  surface: "flat",
  props: z.object({}),
  slots: {
    header: { allow: ["Heading", "Text", "StatusTag", "Stack"] },
    body: {},
    footer: { allow: ["Button", "Text", "Stack"] },
    // An action's result on this Card, along its bottom edge (ADR 0016).
    result: { allow: ["Notice"] },
  },
});
