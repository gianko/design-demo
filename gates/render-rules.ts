// The gate 7 slot: the render-time taste rules of lint/taste/RULES.md. Each
// rule inspects one rendered story and returns its failures, one line each,
// worded so the story, theme and density in the test title complete them.

import type { Page } from "@playwright/test";

export type RenderRule = {
  name: string;
  check: (page: Page, root: string) => Promise<string[]>;
};

export const renderRules: RenderRule[] = [];
