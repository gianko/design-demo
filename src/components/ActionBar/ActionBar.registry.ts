import { z } from "zod";
import { defineEntry } from "../../registry/entry.ts";

// ActionBar has no variants (one raised bar, PLAN.md), so nothing reads its
// tv() config; its body slot is the whole of what a UI spec gives it: the
// action's Buttons, and in the action's failure state the failure Toast
// above them, so the two float as one (#243).
export const actionBarEntry = defineEntry({
  name: "ActionBar",
  use: "The bulk-action bar; put the action's Button here, show it `when: [rows-selected]`, and leave it out of the success state so it becomes that state's Toast. Keep it in the failure state too, so the admin can retry with the rows still selected, and put that state's failure Toast in its body, above the Button. Place it right after the DataTable it acts on. For an action on one thing use its Card's footer; for the screen's own action use PageHeader's actions.",
  surface: "raised",
  props: z.object({}),
  slots: { body: { allow: ["Button", "Toast"] } },
});
