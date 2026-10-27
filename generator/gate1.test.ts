// @vitest-environment node
// Gate 1 (ADR 0004, ADR 0011), against stub registry entries and stub
// fixtures: each planted UI spec breaks one rule, and the failure names that
// rule and the node it found it on.

import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import {
  fixtureVariant,
  operationNames,
  variantNames,
} from "../src/fixtures/fixtures.ts";
import { defineEntry } from "../src/registry/entry.ts";
import { gate1 } from "./gate1.ts";
import { checkPassCriteria } from "./pass-criteria.ts";
import { loadRegistry } from "./registry.ts";
import { readScreenBrief } from "./screen-brief.ts";
import { wireSchema } from "./ui-spec.ts";

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
    name: "Heading",
    use: "A title.",
    props: z.object({ text: z.string(), level: z.number().int() }),
  }),
  defineEntry({
    name: "Button",
    use: "Runs an action.",
    props: z.object({ label: z.string(), pending: z.boolean().optional() }),
    codeOnly: ["pending"],
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
    name: "ActionBar",
    use: "The bulk-action bar.",
    props: z.object({}),
    slots: { body: {} },
  }),
  defineEntry({
    name: "Toast",
    use: "The live result of an action.",
    props: z.object({ text: z.string() }),
  }),
  defineEntry({
    name: "Sheet",
    use: "Row detail.",
    props: z.object({}),
    slots: { body: {} },
  }),
  defineEntry({
    name: "Card",
    use: "A surface.",
    props: z.object({}),
    slots: {
      header: { allow: ["Heading", "Tag", "Stack"] },
      body: {},
      footer: { allow: ["Button", "Stack"] },
    },
  }),
  defineEntry({
    name: "Stack",
    use: "Lays out nodes.",
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
      node("title", "Heading", "screen", "body", {
        text: "Payment status",
        level: 1,
      }),
      shownIn(
        node("empty-heading", "Heading", "screen", "body", {
          text: "Nothing yet",
          level: 2,
        }),
        "empty"
      ),
      // The bar hands off to the toast when the action succeeds.
      shownIn(node("bar", "ActionBar", "screen", "body"), "default"),
      runs(
        node("bar-button", "Button", "bar", "body", { label: "Remind" }),
        "remind"
      ),
      shownIn(
        node("sent-toast", "Toast", "screen", "body", { text: "Sent" }),
        "sent"
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
  it("passes a UI spec that holds every gate 1 rule", () => {
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

  // The code step sets a code-only prop, such as Button's pending from
  // useAction (ADR 0011), so a UI spec that gives one fails as if the
  // component didn't have it.
  it.each([
    ["written as a literal", true],
    ["bound", bind("invoice.client")],
  ])(
    "fails a code-only prop %s, naming it as one Button doesn't take",
    (_, value) => {
      const spec = clean();
      const withTone = clean();
      setProp(nodeOf(spec, "remind-button"), "pending", value);
      setProp(nodeOf(withTone, "remind-button"), "tone", value);

      const failures = gate1(spec, context);
      expect(failures.map(({ rule, location }) => [rule, location])).toEqual([
        ["props-parse", "remind-button"],
      ]);
      expect(failures[0]!.message).toBe(
        gate1(withTone, context)[0]!.message.replace("tone", "pending")
      );
      expect(failures[0]!.message).toContain('"pending"');
    }
  );

  // A Button passed as another component's slot prop, in a DataTable row,
  // rather than one in a body slot.
  it.each([
    ["written as a literal", true],
    ["bound to the row", bind("row.client")],
  ])(
    "fails a code-only prop %s on a Button in a named slot, naming the node",
    (_, value) => {
      const spec = clean();
      const rowButton = node("row-button", "Button", "table", "cell", {
        label: "Remind",
      });
      setProp(rowButton, "pending", value);
      spec.nodes.push(rowButton);

      const failures = gate1(spec, context);
      expect(failures.map(({ rule, location }) => [rule, location])).toEqual([
        ["props-parse", "row-button"],
      ]);
      expect(failures[0]!.message).toContain('"pending"');
    }
  );

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

  describe("headings", () => {
    it("fails a heading that skips a level in one state, naming it", () => {
      const spec = clean();
      // Only the empty state shows it, after the level 1.
      setProp(nodeOf(spec, "empty-heading"), "level", 3);

      expect(check(spec)).toEqual([["heading-skip", "empty-heading"]]);
    });

    it("fails a second level 1 shown in the same state, naming it", () => {
      const spec = clean();
      setProp(nodeOf(spec, "empty-heading"), "level", 1);

      expect(check(spec)).toEqual([["heading-one", "empty-heading"]]);
    });

    it("passes two level 1s that never show in the same state", () => {
      const spec = clean();
      nodeOf(spec, "title").when = ["default", "sent"];
      setProp(nodeOf(spec, "empty-heading"), "level", 1);

      expect(check(spec)).toEqual([]);
    });

    it("fails a state whose headings have no level 1, naming its first", () => {
      const spec = clean();
      nodeOf(spec, "title").when = ["default", "sent"];

      expect(check(spec)).toEqual([["heading-one", "empty-heading"]]);
    });

    it("passes a screen with no headings at all", () => {
      const spec = clean();
      spec.nodes = spec.nodes.filter((n) => n.component !== "Heading");

      expect(check(spec)).toEqual([]);
    });
  });

  describe("ActionBar, Toast and Sheet", () => {
    it("fails a second ActionBar shown in the same state, naming it", () => {
      const spec = clean();
      // Shown in every state, so beside the first bar in default.
      spec.nodes.push(node("second-bar", "ActionBar", "screen", "body"));

      expect(check(spec)).toEqual([["one-action-bar", "second-bar"]]);
    });

    it("fails a second Toast shown in the same state, naming it", () => {
      const spec = clean();
      // Inside the panel, which shows in sent too.
      spec.nodes.push(
        shownIn(
          node("panel-toast", "Toast", "panel", "body", { text: "Done" }),
          "sent"
        )
      );

      expect(check(spec)).toEqual([["one-toast", "panel-toast"]]);
    });

    it.each([
      ["the default state", ["default", "sent"]],
      ["a state no action enters", ["sent", "empty"]],
    ])("fails a Toast shown in %s, naming it", (_, when) => {
      const spec = clean();
      nodeOf(spec, "sent-toast").when = when;

      expect(check(spec)).toEqual([["toast-state", "sent-toast"]]);
    });

    it.each([
      ["outside a DataTable", "panel", "body"],
      ["in a DataTable's cell slot", "table", "cell"],
    ])("fails a Sheet %s, naming it", (_, parent, slot) => {
      const spec = clean();
      spec.nodes.push(node("stray-sheet", "Sheet", parent, slot));

      expect(check(spec)).toEqual([["sheet-in-detail", "stray-sheet"]]);
    });

    it("fails a Button in an ActionBar that runs no action, naming it", () => {
      const spec = clean();
      // Nested a level down inside the bar.
      spec.nodes.push(
        node("bar-panel", "Panel", "bar", "body", { title: "More" }),
        node("idle-button", "Button", "bar-panel", "body", { label: "Later" })
      );

      expect(check(spec)).toEqual([["action-bar-button", "idle-button"]]);
    });
  });

  describe("nested cards", () => {
    function withCard() {
      const spec = clean();
      spec.nodes.push(
        node("card", "Card", "screen", "body"),
        node("card-title", "Heading", "card", "header", {
          text: "Invoice",
          level: 2,
        })
      );
      return spec;
    }

    it("fails a Card in another Card's body, naming the inner Card", () => {
      const spec = withCard();
      spec.nodes.push(node("inner", "Card", "card", "body"));

      expect(check(spec)).toEqual([["nested-cards", "inner"]]);
    });

    it.each(["header", "body", "footer"])(
      "fails a Card inside a Stack in another Card's %s",
      (slot) => {
        const spec = withCard();
        spec.nodes.push(
          node("row", "Stack", "card", slot),
          node("inner", "Card", "row", "body")
        );

        expect(check(spec)).toEqual([["nested-cards", "inner"]]);
      }
    );

    it("fails a Card two Stacks deep in another Card's footer", () => {
      const spec = withCard();
      spec.nodes.push(
        node("column", "Stack", "card", "footer"),
        node("row", "Stack", "column", "body"),
        node("inner", "Card", "row", "body")
      );

      expect(check(spec)).toEqual([["nested-cards", "inner"]]);
    });

    it("passes Cards side by side under a Screen and in a Stack", () => {
      const spec = withCard();
      spec.nodes.push(
        node("second", "Card", "screen", "body"),
        node("row", "Stack", "screen", "body"),
        node("third", "Card", "row", "body"),
        node("fourth", "Card", "row", "body")
      );

      expect(check(spec)).toEqual([]);
    });

    it("ends its walk on Cards whose parents loop", () => {
      const spec = withCard();
      spec.nodes.push(
        node("a", "Card", "b", "body"),
        node("b", "Card", "a", "body")
      );

      expect(check(spec)).toEqual([
        ["no-cycles", "a"],
        ["no-cycles", "b"],
        ["nested-cards", "a"],
        ["nested-cards", "b"],
      ]);
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

// The stub Heading above stands in for the real one; these hold gate 1's
// heading checks to the entry the spec step actually sees.
describe("gate 1 against the library's registry", () => {
  const library = {
    audience: "admin",
    fixtures: { variants: { default: {} }, operations: [] },
  };

  function headings(...levels: string[]) {
    return {
      audience: "admin",
      nodes: [
        node("screen", "Screen", null, null, { audience: "admin" }),
        node("column", "Stack", "screen", "body"),
        ...levels.map((level, i) => ({
          ...node(`heading-${i}`, "Heading", "column", "body"),
          props: [
            { name: "text", value: '"Payment status"' },
            { name: "level", value: level },
          ],
        })),
      ],
      states: [],
      actions: [],
    };
  }

  async function checkLibrary(spec: unknown) {
    const { entries } = await loadRegistry();
    return gate1(spec, { ...library, entries }).map(({ rule, location }) => [
      rule,
      location,
    ]);
  }

  it("takes a Heading level as a number", async () => {
    expect(await checkLibrary(headings("1", "2"))).toEqual([]);
  });

  it("fails a Heading level written as a string", async () => {
    expect(await checkLibrary(headings("1", '"2"'))).toEqual([
      ["props-parse", "heading-1"],
    ]);
  });

  it("fails a level 3 directly after a level 1", async () => {
    expect(await checkLibrary(headings("1", "3"))).toEqual([
      ["heading-skip", "heading-1"],
    ]);
  });

  it("fails two level 1s in the same state", async () => {
    expect(await checkLibrary(headings("1", "2", "1"))).toEqual([
      ["heading-one", "heading-2"],
    ]);
  });

  // DataTable selection is off by default (#203); invoice-queue's brief is
  // unchanged, and the UI spec that meets it turns selection on.
  it("passes an invoice-queue UI spec whose DataTable is selectable, which meets the brief's pass criteria", async () => {
    const live = (id: string, state: string, text: string) =>
      shownIn(node(id, "Text", "column", "body", { text, live: true }), state);
    const spec = {
      audience: "admin",
      nodes: [
        node("screen", "Screen", null, null, { audience: "admin" }),
        node("column", "Stack", "screen", "body"),
        node("header", "PageHeader", "column", "body"),
        node("title", "Heading", "header", "title", {
          text: "Invoices",
          level: 1,
        }),
        runs(
          shownIn(
            node("pay", "Button", "header", "actions", {
              text: "Approve and pay",
              intent: "primary",
            }),
            "rows-selected"
          ),
          "approve-and-pay"
        ),
        shownIn(
          node("table", "DataTable", "column", "body", {
            rows: bind("invoices"),
            columns: ["Invoice", "Contractor", "Amount", "Due", "Status"],
            selectable: true,
          }),
          "default",
          "rows-selected",
          "payment-scheduled",
          "payment-failed"
        ),
        node("number", "Text", "table", "cell", { text: bind("row.number") }),
        node("contractor", "Text", "table", "cell", {
          text: bind("row.contractor"),
        }),
        node("amount", "Amount", "table", "cell", {
          value: bind("row.amount"),
          currency: bind("row.currency"),
          display: "table",
        }),
        node("due", "Text", "table", "cell", { text: bind("row.dueLabel") }),
        node("status", "StatusTag", "table", "cell", {
          status: bind("row.status"),
        }),
        shownIn(
          node("empty", "Text", "column", "body", {
            text: "No invoices to pay. New ones show up here when contractors send them.",
          }),
          "empty"
        ),
        live(
          "scheduled",
          "payment-scheduled",
          "3 invoices scheduled for the Oct 24 run."
        ),
        live(
          "failed",
          "payment-failed",
          "The payment didn't go through. Nothing was paid; try again."
        ),
      ],
      states: [
        { name: "empty", fixture: "invoice-queue/empty" },
        { name: "rows-selected", fixture: "invoice-queue/rows-selected" },
        {
          name: "payment-scheduled",
          fixture: "invoice-queue/payment-scheduled",
        },
        { name: "payment-failed", fixture: "invoice-queue/payment-failed" },
      ],
      actions: [
        {
          name: "approve-and-pay",
          operation: "payInvoices",
          pending: "pay",
          to: { success: "payment-scheduled", failure: "payment-failed" },
        },
      ],
    };
    const { entries } = await loadRegistry();
    const fixtures = {
      variants: Object.fromEntries(
        variantNames.map((name) => [name, fixtureVariant(name).data])
      ),
      operations: operationNames,
    };
    const { requires } = readScreenBrief(
      join(import.meta.dirname, "../evals/briefs/invoice-queue.md")
    );

    expect(gate1(spec, { audience: "admin", entries, fixtures })).toEqual([]);
    expect(checkPassCriteria(requires, wireSchema().parse(spec))).toEqual({
      met: true,
      missing: [],
    });
  });

  // DataTable renders Checkbox; a UI spec never places one (#179).
  it("fails a Checkbox placed in a UI spec as unregistered", async () => {
    const spec = headings("1");
    spec.nodes.push(
      node("tick", "Checkbox", "column", "body", { label: "Select all" })
    );
    const { entries } = await loadRegistry();

    expect(gate1(spec, { ...library, entries })).toEqual([
      {
        gate: "gate 1",
        rule: "registered-component",
        location: "tick",
        message: '"Checkbox" isn\'t a registered component.',
      },
    ]);
  });
});
