// @vitest-environment node
// The header comment `pnpm keep` writes atop a kept screen's stories: it
// names the open-sheet render (ADR 0011) only for a screen that has one.

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { ScreenStateParameters } from "../src/components/Screen/screen-state.tsx";
import { screenStories } from "./screen-stories.ts";
import type { UiNode } from "./ui-spec.ts";
import { repo } from "../repo.ts";

const node = (
  id: string,
  component: string,
  parent: string | null,
  slot: string | null
): UiNode => ({
  id,
  component,
  parent,
  slot,
  props: [],
  when: [],
  action: null,
});

// A DataTable without a detail slot, so no open-sheet render.
const withoutSheet = [
  node("screen", "Screen", null, null),
  node("invoices", "DataTable", "screen", "body"),
  node("invoice", "Text", "invoices", "cell"),
];
// A DataTable with a detail slot, so one open-sheet render.
const withSheet = [
  node("screen", "Screen", null, null),
  node("invoices", "DataTable", "screen", "body"),
  node("invoice", "Sheet", "invoices", "detail"),
];

// The comment lines the source opens with.
const header = (source: string) => source.match(/^(\/\/.*\n)*/)![0];

// The story parameter an open-sheet render sets.
const openSheet: keyof ScreenStateParameters = "openSheet";

const stories = (nodes: UiNode[]) =>
  screenStories({
    slug: "invoices",
    name: "Invoices",
    states: [{ name: "empty", fixture: "bulk-pay/empty" }],
    nodes,
    actions: [],
  });

describe("screenStories' header", () => {
  it("ends after the fixture variant for a screen with no DataTable detail slot", () => {
    expect(header(stories(withoutSheet))).toBe(
      `// Written by \`pnpm keep\`: the default and one story per declared screen
// state, each with its fixture variant.
`
    );
  });

  it("adds the open-sheet render for a screen with a DataTable detail slot", () => {
    expect(header(stories(withSheet))).toBe(
      `// Written by \`pnpm keep\`: the default and one story per declared screen
// state, each with its fixture variant, then the default with each detail
// table's first row's Sheet open.
`
    );
  });

  // A kept screen keeps no UI spec, so its stories can't be written again
  // here; its header is checked against the one written for a screen with
  // or without an open-sheet render, as its kept stories have one or not.
  it.each(keptStories())("is the one pnpm keep now writes atop %s", (path) => {
    const kept = readFileSync(join(repo, path), "utf8");

    expect(header(kept)).toBe(
      header(stories(kept.includes(`${openSheet}:`) ? withSheet : withoutSheet))
    );
  });
});

// Each kept screen's stories, relative to the repo root.
function keptStories() {
  return readdirSync(join(repo, "src/screens")).flatMap((slug) =>
    readdirSync(join(repo, "src/screens", slug))
      .filter((file) => file.endsWith(".stories.tsx"))
      .map((file) => join("src/screens", slug, file))
  );
}
