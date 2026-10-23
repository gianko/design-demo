// @vitest-environment node
// Gate 1 (ADR 0004, ADR 0011), against stub registry entries and stub
// fixtures: each planted UI spec breaks one rule, and the failure names that
// rule and the node it found it on.

import { describe, expect, it } from "vitest";
import { z } from "zod";
import { defineEntry } from "../src/registry/entry.ts";
import { gate1 } from "./gate1.ts";

const entries = [
  defineEntry({
    name: "Screen",
    use: "The root.",
    props: z.object({ audience: z.enum(["admin", "contractor"]) }),
    slots: { body: {} },
  }),
  defineEntry({
    name: "Panel",
    use: "Groups content.",
    props: z.object({ title: z.string(), padded: z.boolean().optional() }),
    slots: { body: {}, actions: { allow: ["Tag"] } },
  }),
  defineEntry({
    name: "Tag",
    use: "A status word.",
    props: z.object({ label: z.string() }),
  }),
  defineEntry({
    name: "Button",
    use: "Runs an action.",
    props: z.object({ label: z.string() }),
  }),
  defineEntry({
    name: "Figure",
    use: "A number.",
    props: z.object({ value: z.number() }),
  }),
  defineEntry({
    name: "DataTable",
    use: "Rows of data.",
    props: z.object({ rows: z.array(z.unknown()) }),
    slots: { cell: {}, detail: { allow: ["Sheet"] } },
  }),
  defineEntry({
    name: "Sheet",
    use: "Row detail.",
    props: z.object({}),
    slots: { body: {} },
  }),
];

// Two variants with the invoice, one without.
const invoice = { client: "Northwind", amount: 4800, number: "INV-0142" };
const fixtures = {
  operations: ["sendReminder"],
  variants: {
    default: { invoice, invoices: [invoice] },
    "brief/empty": { invoice: null, invoices: [] },
    "brief/sent": { invoice, invoices: [invoice] },
  },
};

const bind = (path: string) => ({ bind: path });

type Node = {
  id: string;
  component: string;
  parent: string | null;
  slot: string | null;
  props: { name: string; value: string }[];
  when: string[];
  action: string | null;
};

function node(
  id: string,
  component: string,
  parent: string | null,
  slot: string | null,
  props: Record<string, unknown> = {}
): Node {
  return {
    id,
    component,
    parent,
    slot,
    props: Object.entries(props).map(([name, value]) => ({
      name,
      value: JSON.stringify(value),
    })),
    when: [],
    action: null,
  };
}

function shownIn(n: Node, ...when: string[]) {
  n.when = when;
  return n;
}

// A UI spec that passes every gate 1 rule.
function clean() {
  return {
    audience: "contractor",
    nodes: [
      node("screen", "Screen", null, null, { audience: "contractor" }),
      // The panel shows only where the invoice exists.
      shownIn(
        node("panel", "Panel", "screen", "body", { title: "Invoice" }),
        "default",
        "sent"
      ),
      node("status", "Tag", "panel", "actions", { label: "Overdue" }),
      node("note", "Tag", "panel", "body", { label: "Due Oct 8" }),
      node("client", "Tag", "panel", "body", { label: bind("invoice.client") }),
      node("amount", "Figure", "panel", "body", {
        value: bind("invoice.amount"),
      }),
      node("table", "DataTable", "screen", "body", { rows: bind("invoices") }),
      node("row-client", "Tag", "table", "cell", { label: bind("row.client") }),
      node("row-sheet", "Sheet", "table", "detail"),
      node("sheet-number", "Tag", "row-sheet", "body", {
        label: bind("row.number"),
      }),
      runs(
        node("remind-button", "Button", "panel", "body", {
          label: "Send reminder",
        }),
        "remind"
      ),
      shownIn(
        node("empty-note", "Tag", "screen", "body", { label: "No invoices" }),
        "empty"
      ),
    ],
    states: [
      { name: "empty", fixture: "brief/empty" },
      { name: "sent", fixture: "brief/sent" },
    ],
    actions: [
      {
        name: "remind",
        operation: "sendReminder",
        pending: "remind-button",
        // Failure goes back to the default state.
        to: { success: "sent", failure: "default" },
      },
    ],
  };
}

function runs(n: Node, action: string) {
  n.action = action;
  return n;
}

const context = { entries, audience: "contractor", fixtures };

function check(spec: unknown) {
  return gate1(spec, context).map(({ rule, location }) => [rule, location]);
}

function nodeOf(spec: ReturnType<typeof clean>, id: string) {
  const found = spec.nodes.find((n) => n.id === id);
  if (!found) throw new Error(`no node ${id}`);
  return found;
}

function setProp(n: Node, name: string, value: unknown) {
  n.props = [
    ...n.props.filter((prop) => prop.name !== name),
    { name, value: JSON.stringify(value) },
  ];
}

describe("gate 1", () => {
  it("passes a UI spec that holds every structural rule", () => {
    expect(check(clean())).toEqual([]);
  });

  it("fails a UI spec whose wire shape doesn't parse, naming the field", () => {
    const spec = clean();
    // A prop sent as a bare object, not a { name, value } pair.
    (spec.nodes[2] as unknown as { props: unknown }).props = { label: "x" };

    expect(check(spec)).toEqual([["wire-shape", "nodes.2.props"]]);
  });

  it("fails a UI spec that isn't JSON at all", () => {
    expect(check('{"audience": "contractor", "nodes": [')).toEqual([
      ["wire-shape", "(ui spec)"],
    ]);
  });

  it("fails two nodes with the same id, naming the id", () => {
    const spec = clean();
    // The duplicate sits apart from the node it repeats.
    spec.nodes[3]!.id = "panel";

    expect(check(spec)).toContainEqual(["unique-ids", "panel"]);
  });

  it("fails a second root, naming it", () => {
    const spec = clean();
    spec.nodes.push(node("stray", "Tag", null, null, { label: "Paid" }));

    expect(check(spec)).toEqual([["one-root", "stray"]]);
  });

  it("fails a UI spec with no root at all", () => {
    const spec = clean();
    spec.nodes[0]!.parent = "note";

    expect(check(spec)).toContainEqual(["one-root", "(ui spec)"]);
  });

  it("fails a root that isn't a Screen, naming it", () => {
    const spec = clean();
    const root = spec.nodes[0]!;
    root.component = "Panel";
    root.props = [{ name: "title", value: '"Payment status"' }];

    expect(check(spec)).toEqual([["screen-root", "screen"]]);
  });

  it("fails a Screen nested below the root, naming it", () => {
    const spec = clean();
    spec.nodes.push(
      node("inner", "Screen", "panel", "body", { audience: "contractor" })
    );

    expect(check(spec)).toEqual([["screen-root", "inner"]]);
  });

  it("fails a parent that doesn't exist, naming the child", () => {
    const spec = clean();
    spec.nodes[3]!.parent = "card";

    expect(check(spec)).toEqual([["parent-exists", "note"]]);
  });

  it("fails a cycle that never reaches the root, naming its nodes", () => {
    const spec = clean();
    spec.nodes.push(
      node("a", "Panel", "b", "body", { title: "A" }),
      node("b", "Panel", "a", "body", { title: "B" })
    );

    expect(check(spec)).toEqual([
      ["no-cycles", "a"],
      ["no-cycles", "b"],
    ]);
  });

  it("fails an unregistered component, naming the node", () => {
    const spec = clean();
    spec.nodes[3]!.component = "Badge";

    expect(check(spec)).toEqual([["registered-component", "note"]]);
  });

  it("fails a slot the parent doesn't have, naming the child", () => {
    const spec = clean();
    spec.nodes[3]!.slot = "footer";

    expect(check(spec)).toEqual([["slot-exists", "note"]]);
  });

  it("fails a child with no slot under a parent that has slots", () => {
    const spec = clean();
    spec.nodes[1]!.slot = null;

    expect(check(spec)).toEqual([["slot-exists", "panel"]]);
  });

  it("fails a child of a component that has no slots", () => {
    const spec = clean();
    spec.nodes.push(node("deep", "Tag", "note", null, { label: "Deep" }));

    expect(check(spec)).toEqual([["slot-exists", "deep"]]);
  });

  it("fails a component its slot's allow-list leaves out, naming the child", () => {
    const spec = clean();
    spec.nodes.push(
      node("nested", "Panel", "panel", "actions", { title: "X" })
    );

    expect(check(spec)).toEqual([["slot-allow", "nested"]]);
  });

  it.each([
    ["a prop of the wrong type", "padded", JSON.stringify("yes")],
    ["a prop the entry doesn't have", "tone", JSON.stringify("muted")],
    ["a value that isn't JSON", "title", "Invoice"],
  ])("fails %s, naming the node", (_, name, value) => {
    const spec = clean();
    const panel = spec.nodes[1]!;
    panel.props = [
      ...panel.props.filter((prop) => prop.name !== name),
      { name, value },
    ];

    expect(check(spec)).toEqual([["props-parse", "panel"]]);
  });

  it("fails a required prop that's missing, naming the node", () => {
    const spec = clean();
    spec.nodes[2]!.props = [];

    expect(check(spec)).toEqual([["props-parse", "status"]]);
  });

  it("fails a prop given twice, naming the node", () => {
    const spec = clean();
    spec.nodes[2]!.props.push({ name: "label", value: '"Paid"' });

    expect(check(spec)).toEqual([["props-parse", "status"]]);
  });

  it("fails an audience that isn't the screen brief's", () => {
    const spec = clean();
    spec.audience = "admin";

    expect(check(spec)).toContainEqual(["audience-match", "(ui spec)"]);
  });

  it("fails a Screen whose audience prop isn't the screen brief's, naming it", () => {
    const spec = clean();
    spec.nodes[0]!.props = [{ name: "audience", value: '"admin"' }];

    expect(check(spec)).toEqual([["audience-match", "screen"]]);
  });

  describe("bindings", () => {
    it("fails a path the fixtures don't have, naming the node", () => {
      const spec = clean();
      setProp(nodeOf(spec, "client"), "label", bind("invoice.contractor"));

      expect(check(spec)).toEqual([["binding-resolves", "client"]]);
    });

    it("fails a path that doesn't resolve in one state the node shows in", () => {
      const spec = clean();
      // Shown in every state, so also in empty, where there's no invoice.
      nodeOf(spec, "panel").when = [];

      expect(check(spec)).toEqual([
        ["binding-resolves", "client"],
        ["binding-resolves", "amount"],
      ]);
    });

    it("fails a bound value the prop doesn't take, naming the node", () => {
      const spec = clean();
      setProp(nodeOf(spec, "client"), "label", bind("invoice.amount"));

      expect(check(spec)).toEqual([["binding-type", "client"]]);
    });

    it("fails a binding on a prop the entry doesn't have", () => {
      const spec = clean();
      setProp(nodeOf(spec, "client"), "tone", bind("invoice.client"));

      expect(check(spec)).toEqual([["props-parse", "client"]]);
    });

    it("fails a row path outside a DataTable's cell or detail slot", () => {
      const spec = clean();
      // On the DataTable itself, which is outside its own rows.
      setProp(nodeOf(spec, "table"), "rows", bind("row.invoices"));

      expect(check(spec)).toEqual([["binding-row-scope", "table"]]);
    });

    it("fails a row path that doesn't resolve on a row, naming the node", () => {
      const spec = clean();
      // Below the Sheet, two levels into the detail slot.
      setProp(nodeOf(spec, "sheet-number"), "label", bind("row.dueLabel"));

      expect(check(spec)).toEqual([["binding-resolves", "sheet-number"]]);
    });

    it("fails a row value the prop doesn't take, naming the node", () => {
      const spec = clean();
      setProp(nodeOf(spec, "row-client"), "label", bind("row.amount"));

      expect(check(spec)).toEqual([["binding-type", "row-client"]]);
    });

    it("says which path, state and fixture variant didn't resolve", () => {
      const spec = clean();
      nodeOf(spec, "panel").when = [];

      expect(gate1(spec, context)[0]?.message).toBe(
        '"label" binds "invoice.client", which doesn\'t resolve in state "empty" (fixture variant "brief/empty").'
      );
    });
  });

  describe("states and actions", () => {
    it("fails a state declared twice, naming it", () => {
      const spec = clean();
      spec.states.push({ name: "empty", fixture: "brief/empty" });

      expect(check(spec)).toEqual([["state-unique", "states.empty"]]);
    });

    it("fails a declared state named default, which every screen has", () => {
      const spec = clean();
      spec.states.push({ name: "default", fixture: "brief/sent" });

      expect(check(spec)).toEqual([["state-unique", "states.default"]]);
    });

    it("fails a state whose fixture variant doesn't exist, naming it", () => {
      const spec = clean();
      spec.states[1]!.fixture = "brief/reminder-sent";

      expect(check(spec)).toEqual([["state-fixture", "states.sent"]]);
    });

    it("fails a when naming a state that isn't declared, naming the node", () => {
      const spec = clean();
      // Deep in a row slot, below a node shown in every state.
      nodeOf(spec, "sheet-number").when = ["default", "snet"];

      expect(check(spec)).toEqual([["when-declared", "sheet-number"]]);
    });

    it("fails an action declared twice, naming it", () => {
      const spec = clean();
      spec.actions.push({ ...spec.actions[0]! });

      expect(check(spec)).toEqual([["action-unique", "actions.remind"]]);
    });

    it("fails an operation the fixtures don't have, naming the action", () => {
      const spec = clean();
      spec.actions[0]!.operation = "payInvoices";

      expect(check(spec)).toEqual([["action-operation", "actions.remind"]]);
    });

    it("fails a to that names a state that isn't declared, naming the action", () => {
      const spec = clean();
      spec.actions[0]!.to.failure = "remind-failed";

      expect(check(spec)).toEqual([["action-to", "actions.remind"]]);
    });

    it.each([
      ["a node that doesn't exist", "send-button"],
      ["a node that doesn't run the action", "note"],
    ])("fails a pending that names %s, naming the action", (_, pending) => {
      const spec = clean();
      spec.actions[0]!.pending = pending;

      expect(check(spec)).toEqual([["action-pending", "actions.remind"]]);
    });

    it("fails a node that runs an action that isn't declared, naming it", () => {
      const spec = clean();
      runs(nodeOf(spec, "status"), "send-reminder");

      expect(check(spec)).toEqual([["action-declared", "status"]]);
    });
  });

  it("says in each failure what broke", () => {
    const spec = clean();
    spec.nodes[3]!.slot = "footer";

    expect(gate1(spec, context)).toEqual([
      {
        gate: "gate 1",
        rule: "slot-exists",
        location: "note",
        message: 'Panel has no slot "footer"; its slots are body, actions.',
      },
    ]);
  });
});
