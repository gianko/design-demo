// @vitest-environment node
// requires.transitions (ADR 0011): each transition is a structural pattern
// in the final UI spec, so a UI spec that has the components but places
// them otherwise misses it.

import { describe, expect, it } from "vitest";
import { checkPassCriteria } from "./pass-criteria.ts";
import type { Transition } from "./screen-brief.ts";
import type { UiNode, UiSpec } from "./ui-spec.ts";

function node(
  id: string,
  component: string,
  parent: string | null,
  slot: string | null,
  when: string[] = [],
  action: string | null = null
): UiNode {
  return { id, component, parent, slot, props: [], when, action };
}

// The pay confirmation and the row sheet, as ADR 0011 lays them out: the
// bar shows while rows are selected and after a failure, and the success
// state shows the Toast in its place.
function queue(): UiSpec {
  return {
    audience: "admin",
    nodes: [
      node("screen", "Screen", null, null),
      node("column", "Stack", "screen", "body"),
      node("table", "DataTable", "column", "body"),
      node("number", "Text", "table", "cell"),
      node("sheet", "Sheet", "table", "detail"),
      node("sheet-number", "Text", "sheet", "body"),
      node("bar", "ActionBar", "column", "body", [
        "rows-selected",
        "payment-failed",
      ]),
      node("pay", "Button", "bar", "body", [], "pay"),
      node("scheduled", "Toast", "column", "body", ["payment-scheduled"]),
      node("failed", "Toast", "column", "body", ["payment-failed"]),
    ],
    states: [
      { name: "rows-selected", fixture: "invoice-queue/rows-selected" },
      { name: "payment-scheduled", fixture: "invoice-queue/payment-scheduled" },
      { name: "payment-failed", fixture: "invoice-queue/payment-failed" },
    ],
    actions: [
      {
        name: "pay",
        operation: "payInvoices",
        pending: "pay",
        to: { success: "payment-scheduled", failure: "payment-failed" },
      },
    ],
  };
}

function missing(transition: Transition, spec: UiSpec | undefined) {
  return checkPassCriteria(
    { components: [], states: [], actions: [], transitions: [transition] },
    spec
  ).missing;
}

function edit(spec: UiSpec, id: string, change: Partial<UiNode>) {
  const found = spec.nodes.find((n) => n.id === id);
  if (!found) throw new Error(`no node ${id}`);
  Object.assign(found, change);
  return spec;
}

describe("requires.transitions", () => {
  it("finds both patterns in ADR 0011's layout", () => {
    expect(missing("bar-to-toast", queue())).toEqual([]);
    expect(missing("row-to-sheet", queue())).toEqual([]);
  });

  it("misses every transition when there's no UI spec", () => {
    expect(missing("bar-to-toast", undefined)).toEqual([
      "transition bar-to-toast",
    ]);
  });

  describe("bar-to-toast", () => {
    it("finds the action's Button nested deeper in the bar", () => {
      const spec = queue();
      spec.nodes.push(node("group", "Stack", "bar", "body"));
      edit(spec, "pay", { parent: "group" });

      expect(missing("bar-to-toast", spec)).toEqual([]);
    });

    it.each<[string, (spec: UiSpec) => UiSpec]>([
      [
        "the action's Button sits outside an ActionBar",
        (spec) => edit(spec, "pay", { parent: "column" }),
      ],
      [
        "the ActionBar's Button runs a different action",
        (spec) => edit(spec, "pay", { action: "remind" }),
      ],
      [
        "the ActionBar also shows in the success state",
        (spec) => edit(spec, "bar", { when: [] }),
      ],
      [
        "the success state shows no Toast",
        (spec) => edit(spec, "scheduled", { when: ["payment-failed"] }),
      ],
      [
        "the Toast sits in a part of the screen hidden in the success state",
        (spec) => {
          spec.nodes.push(
            node("panel", "Stack", "column", "body", ["payment-failed"])
          );
          return edit(spec, "scheduled", { parent: "panel" });
        },
      ],
      [
        "the Button never shows, so the action can't be run from the bar",
        (spec) => edit(spec, "pay", { when: ["payment-scheduled"] }),
      ],
    ])("misses it when %s", (_, change) => {
      expect(missing("bar-to-toast", change(queue()))).toEqual([
        "transition bar-to-toast",
      ]);
    });
  });

  describe("row-to-sheet", () => {
    it.each<[string, (spec: UiSpec) => UiSpec]>([
      [
        "the Sheet sits in the DataTable's cell slot",
        (spec) => edit(spec, "sheet", { slot: "cell" }),
      ],
      [
        "the Sheet's parent isn't a DataTable",
        (spec) => edit(spec, "sheet", { parent: "column", slot: "body" }),
      ],
      [
        "the detail slot holds something else",
        (spec) => edit(spec, "sheet", { component: "Card" }),
      ],
    ])("misses it when %s", (_, change) => {
      expect(missing("row-to-sheet", change(queue()))).toEqual([
        "transition row-to-sheet",
      ]);
    });
  });
});
