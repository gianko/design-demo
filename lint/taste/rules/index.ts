// The P0 taste rules (lint/taste/RULES.md), each listed once. A rule's module
// exports its `id`, and `lint` for its static half, `render` for its render
// half, or both.

import * as actionTransitions from "./action-transitions.ts";
import * as edgeTreatment from "./edge-treatment.ts";
import * as gradientAsDecoration from "./gradient-as-decoration.ts";
import * as motionTokens from "./motion-tokens.ts";
import * as nestedCards from "./nested-cards.ts";
import * as noAllCaps from "./no-all-caps.ts";
import * as noPill from "./no-pill.ts";
import * as noPureNeutralText from "./no-pure-neutral-text.ts";
import * as skippedHeading from "./skipped-heading.ts";
import * as tabularNumerals from "./tabular-numerals.ts";
import * as targetSize from "./target-size.ts";
import * as textOverflow from "./text-overflow.ts";
import * as typeOnScale from "./type-on-scale.ts";

export const tasteRules = [
  motionTokens,
  noPill,
  typeOnScale,
  tabularNumerals,
  textOverflow,
  gradientAsDecoration,
  noAllCaps,
  skippedHeading,
  nestedCards,
  actionTransitions,
  edgeTreatment,
  noPureNeutralText,
  targetSize,
];

// The rules ESLint runs as `taste/<id>`.
export const staticRules = tasteRules.flatMap((rule) =>
  "lint" in rule ? [rule] : []
);
