import { z } from "zod";
import { defineEntry, variantEnum } from "../../registry/entry.ts";
import { amount } from "./Amount.tsx";

export const amountEntry = defineEntry({
  name: "Amount",
  use: "An amount of money from a value and its currency, always with cents and tabular figures: display card for the one large figure a Card is about, display table for an amount in a table cell or at the end of a label–value row, where it right-aligns. Never write money into a Text. For copy use Text, for a status StatusTag.",
  props: z.object({
    value: z
      .number()
      .describe("The amount in the currency's major unit: 4800 is 4,800.00."),
    currency: z
      .string()
      .regex(/^[A-Z]{3}$/)
      .describe("The ISO 4217 code, such as USD."),
    display: variantEnum(amount, "display").describe(
      "card for the one large figure a Card is about ($4,800.00); table for an amount among others, in a cell or a row (4,800.00 USD)."
    ),
  }),
});
