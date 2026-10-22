// The gate 7 slot: the render-time taste rules of lint/taste/RULES.md. Each
// rule inspects one rendered story and returns its failures, one line each,
// worded so the story, theme and density in the test title complete them.
// Its help line is its line in RULES.md.

import type { Page } from "@playwright/test";
import * as noPill from "../lint/taste/rules/no-pill.ts";
import * as tabularNumerals from "../lint/taste/rules/tabular-numerals.ts";
import * as textOverflow from "../lint/taste/rules/text-overflow.ts";
import * as typeOnScale from "../lint/taste/rules/type-on-scale.ts";

export type RenderRule = {
  name: string;
  help: string;
  check: (page: Page, root: string) => Promise<string[]>;
};

export const renderRules: RenderRule[] = [
  noPill.render,
  typeOnScale.render,
  tabularNumerals.render,
  textOverflow.render,
];
