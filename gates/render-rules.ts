// The gate 7 slot: the render halves of the taste rules in
// lint/taste/rules/index.ts, run on every rendered story.

import type { RenderRule } from "../lint/taste/render.ts";
import { tasteRules } from "../lint/taste/rules/index.ts";

export const renderRules: RenderRule[] = tasteRules.flatMap((rule) =>
  "render" in rule ? [rule.render] : []
);
