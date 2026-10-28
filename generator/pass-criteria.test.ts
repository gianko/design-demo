// @vitest-environment node
// requires.transitions (ADR 0011, ADR 0013): each transition is a structural
// pattern in the final UI spec, so a UI spec that has the components but
// places them otherwise misses it.

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

function toast(id: string, tone: string, when: string[]): UiNode {
  return {
    ...node(id, "Toast", "screen", "body", when),
    props: [{ name: "tone", value: JSON.stringify(tone) }],
  };
}

// The pay confirmation and the row sheet, as ADR 0013 lays them out: the
// action's Button in the DataTable's actions footer, and the Toasts last in
// the Screen, the success one in the success state and the failure one in
// the failure state.
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
      node("pay", "Button", "table", "actions", [], "pay"),
      toast("failed", "failure", ["payment-failed"]),
      toast("scheduled", "success", ["payment-scheduled"]),
    ],
    states: [
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
  it("finds both patterns in ADR 0013's layout", () => {
    expect(missing("table-action-to-toast", queue())).toEqual([]);
    expect(missing("row-to-sheet", queue())).toEqual([]);
  });

  it("misses every transition when there's no UI spec", () => {
    expect(missing("table-action-to-toast", undefined)).toEqual([
      "transition table-action-to-toast",
    ]);
  });

  describe("table-action-to-toast", () => {
    it("finds Toasts nested deeper in the Screen, written before the table", () => {
      const spec = queue();
      spec.nodes.unshift(node("results", "Stack", "screen", "body"));
      edit(spec, "scheduled", { parent: "results" });
      edit(spec, "failed", { parent: "results" });

      expect(missing("table-action-to-toast", spec)).toEqual([]);
    });

    it.each<[string, (spec: UiSpec) => UiSpec]>([
      [
        "the action's Button sits outside the table, in the page",
        (spec) => edit(spec, "pay", { parent: "column", slot: "body" }),
      ],
      [
        "the action's Button sits in another component's actions slot",
        (spec) => {
          spec.nodes.push(node("header", "PageHeader", "column", "body"));
          return edit(spec, "pay", { parent: "header" });
        },
      ],
      [
        "the footer's Button runs a different action",
        (spec) => edit(spec, "pay", { action: "remind" }),
      ],
      [
        "the table shows only in the action's own outcomes, so it can't be run",
        (spec) =>
          edit(spec, "table", { when: ["payment-scheduled", "payment-failed"] }),
      ],
      [
        "the success state shows no Toast",
        (spec) => edit(spec, "scheduled", { when: ["payment-failed"] }),
      ],
      [
        "the success state's Toast is a failure one",
        (spec) =>
          edit(spec, "scheduled", toast("scheduled", "failure", ["payment-scheduled"])),
      ],
      [
        "the success Toast sits in a part of the screen hidden in the success state",
        (spec) => {
          spec.nodes.push(
            node("panel", "Stack", "column", "body", ["payment-failed"])
          );
          return edit(spec, "scheduled", { parent: "panel" });
        },
      ],
      [
        "the failure state shows no Toast",
        (spec) => edit(spec, "failed", { when: ["payment-scheduled"] }),
      ],
      [
        "the failure state's Toast has no tone",
        (spec) => edit(spec, "failed", { props: [] }),
      ],
    ])("misses it when %s", (_, change) => {
      expect(missing("table-action-to-toast", change(queue()))).toEqual([
        "transition table-action-to-toast",
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
