// @vitest-environment node
// The stories `pnpm keep` writes beside a kept screen: their header names
// the open-sheet render (ADR 0011) and the rows-ticked render (ADR 0013)
// only for a screen that has one, and a footer action is clicked with its
// table's rows ticked.

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { ScreenStateParameters } from "../src/components/Screen/screen-state.tsx";
import {
  keptStoryStates,
  screenStories,
  storyStates,
} from "./screen-stories.ts";
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

// A DataTable with actions, so one rows-ticked render.
const withActions = [
  node("screen", "Screen", null, null),
  node("invoices", "DataTable", "screen", "body"),
  node("invoice-pay", "Button", "invoices", "actions"),
];
// Both.
const withBoth = [
  ...withSheet,
  node("invoice-pay", "Button", "invoices", "actions"),
];

// The comment lines the source opens with.
const header = (source: string) => source.match(/^(\/\/.*\n)*/)![0];

// The story parameters an open-sheet render and a rows-ticked render set.
const openSheet: keyof ScreenStateParameters = "openSheet";
const tickRows: keyof ScreenStateParameters = "tickRows";

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

  it("adds the rows-ticked render for a screen with a DataTable with actions", () => {
    expect(header(stories(withActions))).toBe(
      `// Written by \`pnpm keep\`: the default and one story per declared screen
// state, each with its fixture variant, then the default with every row of
// each table with actions ticked.
`
    );
  });

  it("adds both renders for a screen that has both", () => {
    expect(header(stories(withBoth))).toBe(
      `// Written by \`pnpm keep\`: the default and one story per declared screen
// state, each with its fixture variant, then the default with each detail
// table's first row's Sheet open, and with every row of each table with
// actions ticked.
`
    );
  });

  // A kept screen keeps no UI spec, so its stories can't be written again
  // here; its header is checked against the one written for a screen with
  // or without each render, as its kept stories have one or not.
  it.each(keptStories())("is the one pnpm keep now writes atop %s", (path) => {
    const kept = readFileSync(join(repo, path), "utf8");
    const sheet = kept.includes(`${openSheet}:`);
    const ticked = kept.includes(`${tickRows}:`);

    expect(header(kept)).toBe(
      header(
        stories(
          sheet && ticked
            ? withBoth
            : sheet
              ? withSheet
              : ticked
                ? withActions
                : withoutSheet
        )
      )
    );
  });
});

// The action-transitions rule clicks an action's Button in the first state
// it shows in. A Button in a DataTable's actions footer is disabled until a
// row is ticked (ADR 0013), so it is clicked there with every row of its
// table ticked, through the same test attribute as the rows-ticked render.
describe("screenStories' declared actions", () => {
  const pay: UiNode = {
    ...node("pay", "Button", "payments", "actions"),
    props: [{ name: "text", value: '"Pay selected"' }],
    action: "pay-selected",
  };
  const payStories = (nodes: UiNode[]) =>
    screenStories({
      slug: "bulk-pay",
      name: "BulkPay",
      states: [
        { name: "payment-scheduled", fixture: "bulk-pay/payment-scheduled" },
        { name: "payment-failed", fixture: "bulk-pay/payment-failed" },
      ],
      nodes,
      actions: [
        {
          name: "pay-selected",
          operation: "payInvoices",
          pending: "pay",
          to: { success: "payment-scheduled", failure: "payment-failed" },
        },
      ],
    });

  // The second table with actions the default state shows, after one with
  // actions that shows only in another state, which isn't counted.
  it("clicks a footer Button in the default state with its table's rows ticked, counting the tables with actions that state shows", () => {
    const source = payStories([
      ...withActions,
      {
        ...node("later", "DataTable", "screen", "body"),
        when: ["payment-failed"],
      },
      node("later-retry", "Button", "later", "actions"),
      node("payments", "DataTable", "screen", "body"),
      pay,
    ]);

    expect(source).toContain(
      '"name":"pay-selected","label":"Pay selected","from":"default","tickRows":1,'
    );
  });

  it("ticks no rows for a Button outside a footer", () => {
    const source = payStories([
      node("screen", "Screen", null, null),
      { ...pay, parent: "screen", slot: "body" },
    ]);

    expect(source).toContain('"label":"Pay selected","from":"default","to":');
  });
});

// ADR 0013's rows-ticked render: for each DataTable with actions the default
// state shows, counted in document order, the default with every row of it
// ticked, through the story's `tickRows` parameter.
describe("screenStories' rows-ticked render", () => {
  it("adds one per table with actions the default state shows, and none for a table without", () => {
    const source = stories([
      ...withActions,
      { ...node("hidden", "DataTable", "screen", "body"), when: ["empty"] },
      node("hidden-pay", "Button", "hidden", "actions"),
      node("plain", "DataTable", "screen", "body"),
      node("plain-cell", "Text", "plain", "cell"),
      node("payments", "DataTable", "screen", "body"),
      node("payment-retry", "Button", "payments", "actions"),
    ]);

    expect(source).toContain(
      "export const DefaultRowsTicked: Story = {\n  parameters: { tickRows: 0 },\n};"
    );
    expect(source).toContain(
      "export const DefaultRowsTickedInTable2: Story = {\n  parameters: { tickRows: 1 },\n};"
    );
    expect(source.match(/tickRows:/g)).toHaveLength(2);
  });

  it("names each in storyStates after the open-sheet renders", () => {
    expect(
      storyStates({
        states: [],
        nodes: [...withActions, node("invoice", "Sheet", "invoices", "detail")],
      }).map(({ exportName, state }) => [exportName, state])
    ).toEqual([
      ["Default", "default"],
      ["DefaultSheetOpen", "default, sheet open"],
      ["DefaultRowsTicked", "default, rows ticked"],
    ]);
  });
});

// A kept screen keeps no UI spec, only its stories, so the calibration set
// (evals/calibration.ts) reads its states back from them.
describe("keptStoryStates", () => {
  it("reads back each story's state from the stories screenStories writes", () => {
    const input = {
      slug: "invoices",
      name: "Invoices",
      states: [
        { name: "empty", fixture: "my-invoices/empty" },
        { name: "reminder-sent", fixture: "payment-status/reminder-sent" },
      ],
      nodes: [
        ...withBoth,
        node("more", "DataTable", "screen", "body"),
        node("more-pay", "Button", "more", "actions"),
      ],
      actions: [],
    };

    expect(keptStoryStates(screenStories(input))).toEqual([
      { exportName: "Default", state: "default" },
      { exportName: "Empty", state: "empty" },
      { exportName: "ReminderSent", state: "reminder-sent" },
      { exportName: "DefaultSheetOpen", state: "default, sheet open" },
      { exportName: "DefaultRowsTicked", state: "default, rows ticked" },
      {
        exportName: "DefaultRowsTickedInTable2",
        state: "default, rows ticked in table 2",
      },
    ]);
  });

  it("reads each kept screen's states, formatted as kept", () => {
    const states = (slug: string, name: string) =>
      keptStoryStates(
        readFileSync(
          join(repo, "src/screens", slug, `${name}.stories.tsx`),
          "utf8"
        )
      ).map(({ state }) => state);

    expect(states("bulk-pay", "BulkPay")).toEqual([
      "default",
      "empty",
      "payment-scheduled",
      "payment-failed",
      "default, rows ticked",
    ]);
    expect(states("my-invoices", "MyInvoices")).toEqual([
      "default",
      "empty",
      "default, sheet open",
    ]);
    expect(states("payment-status", "PaymentStatus")).toEqual([
      "default",
      "empty",
      "reminder-sent",
      "reminder-failed",
    ]);
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
