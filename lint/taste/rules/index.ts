// The P0 taste rules (lint/taste/RULES.md), each listed once. A rule's module
// exports its `id`, and `lint` for its static half, `render` for its render
// half, or both.

import * as edgeTreatment from "./edge-treatment.ts";
import * as motionTokens from "./motion-tokens.ts";
import * as noPill from "./no-pill.ts";
import * as tabularNumerals from "./tabular-numerals.ts";
import * as textOverflow from "./text-overflow.ts";
import * as typeOnScale from "./type-on-scale.ts";

export const tasteRules = [
  motionTokens,
  noPill,
  typeOnScale,
  tabularNumerals,
  textOverflow,
  edgeTreatment,
];

// The rules ESLint runs as `taste/<id>`.
export const staticRules = tasteRules.flatMap((rule) =>
  "lint" in rule ? [rule] : []
);
