// @vitest-environment node
// Gate 1 (ADR 0004, ADR 0011), against stub registry entries and stub
// fixtures: each planted UI spec breaks one rule, and the failure names that
// rule and the node it found it on.

import { readFileSync } from "node:fs";
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
    surface: "flat",
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

const context = { entries, audience: "contractor", slug: "brief", fixtures };

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

  // Only Stacks carry a slot's allow-list down; what sits in an allowed
  // component's own slots is that component's business.
  it("holds an allow-list through Stacks but not through other components", () => {
    const footerTakesPanel = entries.map((entry) =>
      entry.name === "Card"
        ? {
            ...entry,
            slots: { ...entry.slots, footer: { allow: ["Panel", "Stack"] } },
          }
        : entry
    );
    const spec = clean();
    spec.nodes.push(
      node("card", "Card", "screen", "body"),
      node("actions", "Stack", "card", "footer"),
      node("aside", "Panel", "actions", "body", { title: "Aside" }),
      node("aside-figure", "Figure", "aside", "body", { value: 3 }),
      node("stray", "Figure", "actions", "body", { value: 4 })
    );

    expect(
      gate1(spec, { ...context, entries: footerTakesPanel }).map(
        ({ rule, location }) => [rule, location]
      )
    ).toEqual([["slot-allow", "stray"]]);
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

    // #275: the spec step lists only `default` and the screen's own
    // variants, so a UI spec may name no other (glossary: Fixture variant).
    // Planted on a screen whose slug only starts with this one's, with the
    // data every binding needs.
    it("fails a state whose fixture variant belongs to another screen, listing the screen's own", () => {
      const spec = clean();
      spec.states[1]!.fixture = "brief-extra/sent";

      expect(
        gate1(spec, {
          ...context,
          fixtures: {
            ...fixtures,
            variants: {
              ...fixtures.variants,
              "brief-extra/sent": fixtures.variants["brief/sent"],
            },
          },
        })
      ).toEqual([
        {
          gate: "gate 1",
          rule: "state-fixture",
          location: "states.sent",
          message:
            'Its fixture variant "brief-extra/sent" is another screen\'s; the variants are default, brief/empty, brief/sent.',
        },
      ]);
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

    // Only a failure Toast sits in a bar (#243). This library's Toast has no
    // tone, so a Toast nested a level down in the bar, out of sight of a
    // check that reads only the bar's own children, has none either.
    it("fails a Toast in an ActionBar whose tone isn't failure, naming it", () => {
      const spec = clean();
      nodeOf(spec, "bar").when = ["default", "sent"];
      spec.nodes = spec.nodes.filter((n) => n.id !== "sent-toast");
      spec.nodes.push(
        node("bar-panel", "Panel", "bar", "body", { title: "More" }),
        shownIn(
          node("bar-toast", "Toast", "bar-panel", "body", { text: "Sent" }),
          "sent"
        )
      );

      expect(check(spec)).toEqual([["bar-toast-tone", "bar-toast"]]);
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

    // The header's and footer's allow-lists, which hold through the Stack,
    // leave a Card out too.
    it.each([
      ["header", [["slot-allow", "inner"]]],
      ["body", []],
      ["footer", [["slot-allow", "inner"]]],
    ])("fails a Card inside a Stack in another Card's %s", (slot, allow) => {
      const spec = withCard();
      spec.nodes.push(
        node("row", "Stack", "card", slot),
        node("inner", "Card", "row", "body")
      );

      expect(check(spec)).toEqual([...allow, ["nested-cards", "inner"]]);
    });

    it("fails a Card two Stacks deep in another Card's footer", () => {
      const spec = withCard();
      spec.nodes.push(
        node("column", "Stack", "card", "footer"),
        node("row", "Stack", "column", "body"),
        node("inner", "Card", "row", "body")
      );

      expect(check(spec)).toEqual([
        ["slot-allow", "inner"],
        ["nested-cards", "inner"],
      ]);
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

    // The flag on the entry is what makes a surface, so a component that
    // opts in where it's defined is checked with no change to gate 1.
    it("fails a Card in any component its entry marks a flat surface", () => {
      const flatPanel = entries.map((entry) =>
        entry.name === "Panel" ? { ...entry, surface: "flat" as const } : entry
      );
      const spec = clean();
      spec.nodes.push(
        node("row", "Stack", "panel", "body"),
        node("inner", "Card", "row", "body")
      );

      expect(
        gate1(spec, { ...context, entries: flatPanel }).map(
          ({ rule, location }) => [rule, location]
        )
      ).toEqual([["nested-cards", "inner"]]);
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
    slug: "brief",
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

  // A DataTable's actions footer (ADR 0013): a table is selectable exactly
  // when it has actions, which take only Buttons, each running an action, and
  // such a table gives its selected count's three forms, `other` holding the
  // `{count}` the library fills.
  describe("a DataTable's actions footer", () => {
    const selectionText = {
      none: "No invoices selected",
      one: "1 invoice selected",
      other: "{count} invoices selected",
    };
    // invoice-queue as its brief asks for it, Approve and pay in the
    // table's footer.
    function invoiceQueue() {
      const live = (id: string, state: string, text: string) =>
        shownIn(
          node(id, "Text", "column", "body", { text, live: true }),
          state
        );
      return {
        audience: "admin",
        nodes: [
          node("screen", "Screen", null, null, { audience: "admin" }),
          node("column", "Stack", "screen", "body"),
          node("header", "PageHeader", "column", "body"),
          node("title", "Heading", "header", "title", {
            text: "Invoices",
            level: 1,
          }),
          shownIn(
            node("table", "DataTable", "column", "body", {
              rows: bind("invoices"),
              columns: ["Invoice", "Contractor", "Amount", "Due", "Status"],
              selectionText,
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
          runs(
            node("pay", "Button", "table", "actions", {
              text: "Approve and pay",
              intent: "primary",
            }),
            "approve-and-pay"
          ),
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
    }

    const table = (spec: ReturnType<typeof invoiceQueue>) =>
      nodeOf(spec as ReturnType<typeof clean>, "table");

    async function checkQueue(spec: ReturnType<typeof invoiceQueue>) {
      const { entries } = await loadRegistry();
      const fixtures = {
        variants: Object.fromEntries(
          variantNames.map((name) => [name, fixtureVariant(name).data])
        ),
        operations: operationNames,
      };
      return gate1(spec, {
        audience: "admin",
        slug: "invoice-queue",
        entries,
        fixtures,
      });
    }

    it("passes invoice-queue with Approve and pay in the footer, which meets the brief's pass criteria", async () => {
      const spec = invoiceQueue();
      const { requires } = readScreenBrief(
        join(import.meta.dirname, "../evals/briefs/invoice-queue.md")
      );

      expect(await checkQueue(spec)).toEqual([]);
      expect(checkPassCriteria(requires, wireSchema().parse(spec))).toEqual({
        met: true,
        missing: [],
      });
    });

    it("fails a table with actions and no selectionText, naming the table", async () => {
      const spec = invoiceQueue();
      const at = table(spec);
      at.props = at.props.filter((prop) => prop.name !== "selectionText");

      expect(await checkQueue(spec)).toEqual([
        {
          gate: "gate 1",
          rule: "selection-text",
          location: "table",
          message:
            'It has actions, so it gives selectionText: { "none", "one", "other" }, the footer\'s selected count with no row, one row and more rows ticked, such as "No invoices selected", "1 invoice selected" and "{count} invoices selected".',
        },
      ]);
    });

    // `{count}` written in the one form, where it isn't needed, and left
    // out of the other form, where it is.
    it("fails a selectionText whose other form has no {count}, even with one in another form", async () => {
      const spec = invoiceQueue();
      setProp(table(spec), "selectionText", {
        none: "No invoices selected",
        one: "{count} invoice selected",
        other: "Several invoices selected",
      });

      expect(await checkQueue(spec)).toEqual([
        {
          gate: "gate 1",
          rule: "selection-count",
          location: "table",
          message:
            'Its selectionText\'s other form, "Several invoices selected", has no {count}; write it where the number goes, such as "{count} invoices selected", and the library fills it in.',
        },
      ]);
    });

    // A Toast is what an action shows next to the footer, so it's the
    // component most likely to be put in it.
    it("fails anything but a Button in the actions slot", async () => {
      const spec = invoiceQueue();
      spec.nodes.push(
        shownIn(
          node("failed-here", "Toast", "table", "actions", {
            text: "The payment didn't go through.",
            tone: "failure",
          }),
          "payment-failed"
        )
      );

      expect(
        (await checkQueue(spec)).map(({ rule, location, message }) => [
          rule,
          location,
          message,
        ])
      ).toEqual([
        [
          "slot-allow",
          "failed-here",
          "DataTable's actions slot takes only Button, not Toast.",
        ],
      ]);
    });

    it("fails a footer Button that runs no action", async () => {
      const spec = invoiceQueue();
      spec.nodes.push(
        node("export", "Button", "table", "actions", {
          text: "Export",
          intent: "secondary",
        })
      );

      expect(
        (await checkQueue(spec)).map(({ rule, location }) => [rule, location])
      ).toEqual([["table-action-button", "export"]]);
    });
  });

  // ADR 0011's pay confirmation with the library's own ActionBar and Toast:
  // the bar shows while rows are selected and after a failure, and the
  // success state shows a Toast where the bar was.
  describe("the pay confirmation", () => {
    function payConfirmation() {
      return {
        audience: "admin",
        nodes: [
          node("screen", "Screen", null, null, { audience: "admin" }),
          node("column", "Stack", "screen", "body"),
          node("header", "PageHeader", "column", "body"),
          node("title", "Heading", "header", "title", {
            text: "Invoices",
            level: 1,
          }),
          node("table", "DataTable", "column", "body", {
            rows: bind("invoices"),
            columns: ["Invoice"],
          }),
          node("number", "Text", "table", "cell", { text: bind("row.number") }),
          shownIn(
            node("bar", "ActionBar", "column", "body"),
            "rows-selected",
            "payment-failed"
          ),
          // The failure Toast sits in the bar, above its Button, so the two
          // stick as one (#243).
          shownIn(
            node("failed", "Toast", "bar", "body", {
              text: "The payment didn't go through. Nothing was paid; try again.",
              tone: "failure",
            }),
            "payment-failed"
          ),
          runs(
            node("pay", "Button", "bar", "body", {
              text: "Approve and pay",
              intent: "primary",
            }),
            "approve-and-pay"
          ),
          shownIn(
            node("scheduled", "Toast", "column", "body", {
              text: "Invoices scheduled for the next run.",
              tone: "success",
            }),
            "payment-scheduled"
          ),
        ],
        states: [
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
    }

    async function checkQueue(spec: ReturnType<typeof payConfirmation>) {
      const { entries } = await loadRegistry();
      const fixtures = {
        variants: Object.fromEntries(
          variantNames.map((name) => [name, fixtureVariant(name).data])
        ),
        operations: operationNames,
      };
      return gate1(spec, {
        audience: "admin",
        slug: "invoice-queue",
        entries,
        fixtures,
      }).map(({ rule, location }) => [rule, location]);
    }

    it("passes, and has the bar-to-toast transition", async () => {
      const spec = payConfirmation();

      expect(await checkQueue(spec)).toEqual([]);
      expect(
        checkPassCriteria(
          {
            components: ["ActionBar", "Toast"],
            states: [],
            actions: ["approve-and-pay"],
            transitions: ["bar-to-toast"],
          },
          wireSchema().parse(spec)
        )
      ).toEqual({ met: true, missing: [] });
    });

    it("fails a second ActionBar in the failure state", async () => {
      const spec = payConfirmation();
      spec.nodes.push(
        shownIn(
          node("retry-bar", "ActionBar", "column", "body"),
          "payment-failed"
        )
      );

      expect(await checkQueue(spec)).toEqual([["one-action-bar", "retry-bar"]]);
    });

    it("fails a second Toast in the success state", async () => {
      const spec = payConfirmation();
      spec.nodes.push(
        shownIn(
          node("also", "Toast", "column", "body", {
            text: "Paid.",
            tone: "success",
          }),
          "payment-scheduled"
        )
      );

      expect(await checkQueue(spec)).toEqual([["one-toast", "also"]]);
    });

    it("fails a Toast in a state no action enters", async () => {
      const spec = payConfirmation();
      nodeOf(spec, "scheduled").when = ["rows-selected"];

      expect(await checkQueue(spec)).toEqual([["toast-state", "scheduled"]]);
    });

    it("fails a success Toast inside the bar, naming it", async () => {
      const spec = payConfirmation();
      setProp(nodeOf(spec, "failed"), "tone", "success");

      expect(await checkQueue(spec)).toEqual([["bar-toast-tone", "failed"]]);
    });

    it("fails a failure Toast beside the bar its state shows, naming it", async () => {
      const spec = payConfirmation();
      nodeOf(spec, "failed").parent = "column";

      expect(await checkQueue(spec)).toEqual([
        ["failure-toast-in-bar", "failed"],
      ]);
    });

    it("passes a failure Toast in a state that shows no ActionBar", async () => {
      const spec = payConfirmation();
      nodeOf(spec, "bar").when = ["rows-selected"];
      nodeOf(spec, "failed").parent = "column";

      expect(await checkQueue(spec)).toEqual([]);
    });

    it("names the fix in each repair message", async () => {
      const success = payConfirmation();
      setProp(nodeOf(success, "failed"), "tone", "success");
      const beside = payConfirmation();
      nodeOf(beside, "failed").parent = "column";
      const { entries } = await loadRegistry();
      const fixtures = {
        variants: Object.fromEntries(
          variantNames.map((name) => [name, fixtureVariant(name).data])
        ),
        operations: operationNames,
      };
      const messages = [success, beside].flatMap((spec) =>
        gate1(spec, {
          audience: "admin",
          slug: "invoice-queue",
          entries,
          fixtures,
        }).map(({ message }) => message)
      );

      expect(messages).toEqual([
        expect.stringMatching(/Give it tone failure/),
        expect.stringMatching(/Move it into the ActionBar "bar"'s body slot/),
      ]);
    });

    it("fails a Button in the bar that runs no action", async () => {
      const spec = payConfirmation();
      spec.nodes.push(
        node("later", "Button", "bar", "body", {
          text: "Later",
          intent: "secondary",
        })
      );

      expect(await checkQueue(spec)).toEqual([["action-bar-button", "later"]]);
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

  // Sheet is read-only row detail (#213): its title is a Heading, and its
  // body holds only Heading, Text, Amount, StatusTag and Stack, so a UI spec
  // can't nest a Card in it or put an action in it. Only failures on the
  // Sheet's children are read: the table around it is the detail slot's
  // tests' business.
  describe("Sheet's children", () => {
    function sheetWith(...children: Node[]) {
      return {
        audience: "admin",
        nodes: [
          node("screen", "Screen", null, null, { audience: "admin" }),
          node("column", "Stack", "screen", "body"),
          node("header", "PageHeader", "column", "body"),
          node("title", "Heading", "header", "title", {
            text: "Invoices",
            level: 1,
          }),
          node("table", "DataTable", "column", "body", {
            rows: bind("invoices"),
            columns: ["Invoice"],
          }),
          node("number", "Text", "table", "cell", { text: bind("row.number") }),
          node("sheet", "Sheet", "table", "detail", {
            closeLabel: "Close invoice details",
          }),
          ...children,
        ],
        states: [],
        actions: [],
      };
    }

    async function childFailures(...children: Node[]) {
      const { entries } = await loadRegistry();
      const ids = new Set(children.map((child) => child.id));
      return gate1(sheetWith(...children), { ...library, entries })
        .filter(({ location }) => ids.has(location))
        .map(({ rule, location }) => [rule, location]);
    }

    it("takes a Heading title and a body of Heading, Text, Amount, StatusTag and Stack", async () => {
      expect(
        await childFailures(
          node("sheet-title", "Heading", "sheet", "title", {
            text: "INV-0142",
            level: 2,
          }),
          node("sheet-group", "Heading", "sheet", "body", {
            text: "Payment",
            level: 3,
          }),
          node("sheet-note", "Text", "sheet", "body", { text: "Due Oct 24" }),
          node("sheet-amount", "Amount", "sheet", "body", {
            value: 4800,
            currency: "USD",
            display: "card",
          }),
          node("sheet-status", "StatusTag", "sheet", "body", {
            status: "awaiting",
          }),
          node("sheet-facts", "Stack", "sheet", "body")
        )
      ).toEqual([]);
    });

    it.each([
      [
        "a Card",
        node("sheet-card", "Card", "sheet", "body"),
        // The Sheet is a surface of its own, so the DataTable it sits in
        // isn't the Card's nearest surface: only the slot is wrong.
        [["slot-allow", "sheet-card"]],
      ],
      [
        "a Button",
        node("sheet-pay", "Button", "sheet", "body", {
          text: "Approve and pay",
          intent: "primary",
        }),
        [["slot-allow", "sheet-pay"]],
      ],
      [
        "a DataTable",
        node("sheet-lines", "DataTable", "sheet", "body", {
          rows: bind("invoices"),
          columns: ["Invoice"],
        }),
        [["slot-allow", "sheet-lines"]],
      ],
      [
        "a Text as its title",
        node("sheet-title", "Text", "sheet", "title", { text: "INV-0142" }),
        [["slot-allow", "sheet-title"]],
      ],
    ])("fails %s in a Sheet, naming it", async (_, child, failures) => {
      expect(await childFailures(child)).toEqual(failures);
    });
  });

  // A slot's allow-list holds through Stacks, which are layout, not content
  // (#253): a node in a chain of Stacks is checked against the nearest
  // enclosing slot that has one.
  describe("allow-lists through Stacks", () => {
    function screenWith(...children: Node[]) {
      return {
        audience: "admin",
        nodes: [
          node("screen", "Screen", null, null, { audience: "admin" }),
          node("column", "Stack", "screen", "body"),
          node("header", "PageHeader", "column", "body"),
          node("title", "Heading", "header", "title", {
            text: "Invoices",
            level: 1,
          }),
          node("invoice", "Card", "column", "body"),
          node("table", "DataTable", "column", "body", {
            rows: bind("invoices"),
            columns: ["Invoice"],
          }),
          node("number", "Text", "table", "cell", { text: bind("row.number") }),
          node("sheet", "Sheet", "table", "detail", {
            closeLabel: "Close invoice details",
          }),
          ...children,
        ],
        states: [],
        actions: [],
      };
    }

    // Only the planted children's failures are read.
    async function childFailures(...children: Node[]) {
      const { entries } = await loadRegistry();
      const fixtures = {
        variants: { default: fixtureVariant("default").data },
        operations: operationNames,
      };
      const ids = new Set(children.map((child) => child.id));
      return gate1(screenWith(...children), {
        audience: "admin",
        slug: "brief",
        entries,
        fixtures,
      }).filter(({ location }) => ids.has(location));
    }

    const button = (id: string, parent: string) =>
      node(id, "Button", parent, "body", {
        text: "Approve and pay",
        intent: "primary",
      });

    it("fails a Button in a Stack in a Sheet's body, naming the Sheet's body slot and the Stack", async () => {
      expect(
        await childFailures(
          node("facts", "Stack", "sheet", "body"),
          button("pay", "facts")
        )
      ).toEqual([
        {
          gate: "gate 1",
          rule: "slot-allow",
          location: "pay",
          message:
            'Sheet\'s body slot takes only Heading, Text, Amount, StatusTag, Stack, not Button (inside the Stack "facts").',
        },
      ]);
    });

    it("fails a Button two Stacks deep in a Sheet's body the same way", async () => {
      expect(
        await childFailures(
          node("facts", "Stack", "sheet", "body"),
          node("row", "Stack", "facts", "body"),
          button("pay", "row")
        )
      ).toEqual([
        {
          gate: "gate 1",
          rule: "slot-allow",
          location: "pay",
          message:
            'Sheet\'s body slot takes only Heading, Text, Amount, StatusTag, Stack, not Button (inside the Stack "row").',
        },
      ]);
    });

    it("passes Text in a Stack in a Sheet's body", async () => {
      expect(
        await childFailures(
          node("facts", "Stack", "sheet", "body"),
          node("due", "Text", "facts", "body", { text: bind("row.number") })
        )
      ).toEqual([]);
    });

    it("fails a Heading in a Stack in a Card's footer, naming the Card's footer slot", async () => {
      expect(
        await childFailures(
          node("actions", "Stack", "invoice", "footer"),
          node("aside", "Heading", "actions", "body", {
            text: "Next step",
            level: 2,
          })
        )
      ).toEqual([
        {
          gate: "gate 1",
          rule: "slot-allow",
          location: "aside",
          message:
            'Card\'s footer slot takes only Button, Text, Stack, not Heading (inside the Stack "actions").',
        },
      ]);
    });

    it("passes a Button in a Stack in a Card's footer", async () => {
      expect(
        await childFailures(
          node("actions", "Stack", "invoice", "footer"),
          button("pay", "actions")
        )
      ).toEqual([]);
    });

    it("passes a Button in a Stack in a Card's body, which has no allow-list", async () => {
      expect(
        await childFailures(
          node("lines", "Stack", "invoice", "body"),
          button("pay", "lines")
        )
      ).toEqual([]);
    });
  });

  // Row → sheet (ADR 0011, #214): DataTable's detail slot holds one Sheet,
  // bound in row scope, and a Sheet anywhere else is rejected.
  describe("DataTable's detail slot", () => {
    function invoicesWithSheet(parent: string, slot: string) {
      return {
        audience: "contractor",
        nodes: [
          node("screen", "Screen", null, null, { audience: "contractor" }),
          node("column", "Stack", "screen", "body"),
          node("title", "Heading", "column", "body", {
            text: "My invoices",
            level: 1,
          }),
          node("table", "DataTable", "column", "body", {
            rows: bind("invoices"),
            columns: ["Invoice", "Status"],
          }),
          node("number", "Text", "table", "cell", { text: bind("row.number") }),
          node("status", "StatusTag", "table", "cell", {
            status: bind("row.status"),
          }),
          node("sheet", "Sheet", parent, slot, {
            closeLabel: "Close invoice details",
          }),
          node("sheet-title", "Heading", "sheet", "title", {
            text: bind("row.number"),
            level: 2,
          }),
          node("sheet-amount", "Amount", "sheet", "body", {
            value: bind("row.amount"),
            currency: bind("row.currency"),
            display: "card",
          }),
          // What the row doesn't show (#293).
          node("sheet-description", "Text", "sheet", "body", {
            text: bind("row.description"),
          }),
          node("sheet-issued", "Text", "sheet", "body", {
            text: bind("row.issuedLabel"),
          }),
        ],
        states: [],
        actions: [],
      };
    }

    async function checkWithFixtures(spec: unknown) {
      const { entries } = await loadRegistry();
      const fixtures = {
        variants: { default: fixtureVariant("default").data },
        operations: operationNames,
      };
      return gate1(spec, {
        audience: "contractor",
        slug: "my-invoices",
        entries,
        fixtures,
      }).map(({ rule, location }) => [rule, location]);
    }

    it("passes a Sheet in a DataTable's detail slot, its children bound to the row", async () => {
      expect(
        await checkWithFixtures(invoicesWithSheet("table", "detail"))
      ).toEqual([]);
    });

    // Its children's row.* bindings fail there too; only the Sheet's own
    // failures are read.
    it("fails a Sheet outside a DataTable, naming it", async () => {
      const failures = await checkWithFixtures(
        invoicesWithSheet("column", "body")
      );

      expect(failures.filter(([, location]) => location === "sheet")).toEqual([
        ["sheet-in-detail", "sheet"],
      ]);
    });

    it("fails a Sheet in a DataTable's cell slot, naming it", async () => {
      expect(
        await checkWithFixtures(invoicesWithSheet("table", "cell"))
      ).toEqual([
        ["slot-allow", "sheet"],
        ["sheet-in-detail", "sheet"],
      ]);
    });

    it("fails anything but a Sheet in the detail slot, naming it", async () => {
      const spec = invoicesWithSheet("table", "detail");
      spec.nodes.push(
        node("stray-text", "Text", "table", "detail", {
          text: bind("row.number"),
        })
      );

      expect(await checkWithFixtures(spec)).toEqual([
        ["slot-allow", "stray-text"],
      ]);
    });
  });

  // Card, DataTable and EmptyState paint the same flat surface, so none sits
  // anywhere beneath another (#246); a raised or overlay surface such as a
  // Sheet isn't one of them.
  describe("surfaces inside surfaces", () => {
    function summaryWith(...children: Node[]) {
      return {
        audience: "contractor",
        nodes: [
          node("screen", "Screen", null, null, { audience: "contractor" }),
          node("column", "Stack", "screen", "body"),
          node("title", "Heading", "column", "body", {
            text: "My invoices",
            level: 1,
          }),
          node("summary", "Card", "column", "body"),
          node("summary-note", "Text", "summary", "body", {
            text: "Paid within 30 days",
          }),
          ...children,
        ],
        states: [],
        actions: [],
      };
    }

    async function checkSurfaces(spec: unknown) {
      const { entries } = await loadRegistry();
      const fixtures = {
        variants: { default: fixtureVariant("default").data },
        operations: operationNames,
      };
      return gate1(spec, {
        audience: "contractor",
        slug: "my-invoices",
        entries,
        fixtures,
      });
    }

    const table = (id: string, parent: string, slot: string) => [
      node(id, "DataTable", parent, slot, {
        rows: bind("invoices"),
        columns: ["Invoice"],
      }),
      node(`${id}-number`, "Text", id, "cell", { text: bind("row.number") }),
    ];

    it("fails a Card in a Card's body, naming both", async () => {
      expect(
        await checkSurfaces(
          summaryWith(node("inner", "Card", "summary", "body"))
        )
      ).toEqual([
        {
          gate: "gate 1",
          rule: "nested-cards",
          location: "inner",
          message:
            'The Card "inner" sits inside the Card "summary"; a surface never goes inside a surface: put it beside the Card, or use a Stack for layout.',
        },
      ]);
    });

    it("fails an EmptyState in a Card's body, naming both", async () => {
      expect(
        await checkSurfaces(
          summaryWith(
            node("empty", "EmptyState", "summary", "body", {
              title: "No invoices yet",
            })
          )
        )
      ).toEqual([
        {
          gate: "gate 1",
          rule: "nested-cards",
          location: "empty",
          message:
            'The EmptyState "empty" sits inside the Card "summary"; a surface never goes inside a surface: put it beside the Card, or use a Stack for layout.',
        },
      ]);
    });

    it("fails a DataTable in a Stack in a Card's body, naming both", async () => {
      expect(
        await checkSurfaces(
          summaryWith(
            node("lines", "Stack", "summary", "body"),
            ...table("table", "lines", "body")
          )
        )
      ).toEqual([
        {
          gate: "gate 1",
          rule: "nested-cards",
          location: "table",
          message:
            'The DataTable "table" sits inside the Card "summary"; a surface never goes inside a surface: put it beside the Card, or use a Stack for layout.',
        },
      ]);
    });

    it("passes a Card, an EmptyState and a DataTable side by side", async () => {
      expect(
        await checkSurfaces(
          summaryWith(
            node("empty", "EmptyState", "column", "body", {
              title: "No invoices yet",
            }),
            ...table("table", "column", "body")
          )
        )
      ).toEqual([]);
    });

    it("passes a Sheet in a DataTable's detail slot", async () => {
      expect(
        await checkSurfaces(
          summaryWith(
            ...table("table", "column", "body"),
            node("sheet", "Sheet", "table", "detail", {
              closeLabel: "Close invoice details",
            }),
            node("sheet-title", "Heading", "sheet", "title", {
              text: bind("row.number"),
              level: 2,
            })
          )
        )
      ).toEqual([]);
    });

    // The Sheet is the Card's nearest surface, and an overlay one, so the
    // DataTable above it isn't what the Card sits on: telling it to move
    // beside the DataTable would be wrong advice. The Sheet's slot names the
    // real problem.
    it("fails a Card in a Sheet in a DataTable's detail only on the Sheet's slot", async () => {
      expect(
        (
          await checkSurfaces(
            summaryWith(
              ...table("table", "column", "body"),
              node("sheet", "Sheet", "table", "detail", {
                closeLabel: "Close invoice details",
              }),
              node("sheet-title", "Heading", "sheet", "title", {
                text: bind("row.number"),
                level: 2,
              }),
              node("sheet-card", "Card", "sheet", "body")
            )
          )
        ).map(({ rule, location }) => [rule, location])
      ).toEqual([["slot-allow", "sheet-card"]]);
    });
  });

  // Sheet renders IconButton as its close button; a UI spec never places one
  // (#212). The library has the entry, and the code step sees it, so it's
  // the internal mark that keeps it out of a UI spec.
  it("fails an IconButton placed in a UI spec as unregistered, though the code step sees it", async () => {
    const spec = headings("1");
    spec.nodes.push(
      node("close", "IconButton", "column", "body", {
        icon: "close",
        label: "Close invoice details",
      })
    );
    const { entries, serialized } = await loadRegistry();

    expect(JSON.parse(serialized.code)).toContainEqual(
      expect.objectContaining({ name: "IconButton", internal: true })
    );
    expect(gate1(spec, { ...library, entries })).toEqual([
      {
        gate: "gate 1",
        rule: "registered-component",
        location: "close",
        message: '"IconButton" isn\'t a registered component.',
      },
    ]);
  });
});

// #275: the UI spec bulk-pay was kept from (#211), against the real registry
// and fixtures. Every fixture variant it names is its own.
describe("the committed bulk-pay UI spec", () => {
  const brief = readScreenBrief(
    join(import.meta.dirname, "../evals/briefs/bulk-pay.md")
  );
  const committed = () =>
    JSON.parse(
      readFileSync(
        join(import.meta.dirname, "fixtures/bulk-pay.ui-spec.json"),
        "utf8"
      )
    ) as { states: { name: string; fixture: string }[] };
  const check = async (spec: unknown) =>
    gate1(spec, {
      entries: (await loadRegistry()).entries,
      audience: brief.audience,
      slug: brief.slug,
      fixtures: {
        variants: Object.fromEntries(
          variantNames.map((name) => [name, fixtureVariant(name).data])
        ),
        operations: operationNames,
      },
    });

  it("passes gate 1", async () => {
    expect(await check(committed())).toEqual([]);
  });

  it("fails a state that names invoice-queue's empty variant, a real one", async () => {
    const spec = committed();
    spec.states.find(({ name }) => name === "empty")!.fixture =
      "invoice-queue/empty";

    expect(
      (await check(spec)).map(({ rule, location }) => [rule, location])
    ).toEqual([["state-fixture", "states.empty"]]);
  });
});
