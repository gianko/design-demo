import { z } from "zod";
import { defineEntry, variantEnum } from "../../registry/entry.ts";
import { stack } from "./Stack.tsx";

export const stackEntry = defineEntry({
  name: "Stack",
  use: "Lays out two or more nodes in a column or a row with a gap from the spacing scale; use it wherever a slot holds more than one node, nesting a row inside a column for side-by-side content. It paints nothing: for a surface use Card.",
  props: z.object({
    direction: variantEnum(stack, "direction")
      .optional()
      .describe(
        "column (the default) stacks top to bottom; row runs left to right and wraps onto a new line when it runs out of room."
      ),
    gap: variantEnum(stack, "gap")
      .optional()
      .describe(
        "Space between children, a spacing step from 0 (none) through 3xs (4px), 2xs (8px), xs (12px), sm (16px, the default), md (20px), lg (24px), xl (32px), 2xl (40px), 3xl (48px) to 4xl (64px)."
      ),
    align: variantEnum(stack, "align")
      .optional()
      .describe(
        "Cross-axis alignment. Defaults to stretch in a column, so children fill its width, and center in a row, so mixed heights line up; baseline lines up text of different sizes in a row."
      ),
    justify: variantEnum(stack, "justify")
      .optional()
      .describe(
        "Main-axis placement: start (the default); between pushes the first and last child to opposite ends, as for an amount at the end of its row; end gathers children at the end, as for actions."
      ),
  }),
  slots: { body: {} },
});
