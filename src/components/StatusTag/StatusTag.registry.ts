import { z } from "zod";
import { defineEntry, variantEnum } from "../../registry/entry.ts";
import { statusTag } from "./StatusTag.tsx";

export const statusTagEntry = defineEntry({
  name: "StatusTag",
  use: "An invoice's or payment's status as a small tag that shows its word (Awaiting, Overdue, Paid, Scheduled, Failed); bind status to the invoice's status. Never write a status into a Text. For copy use Text, for money Amount.",
  props: z.object({
    status: variantEnum(statusTag, "status").describe(
      "The status from the data; the tag writes its word and picks its colour."
    ),
  }),
});
