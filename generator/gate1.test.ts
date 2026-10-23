// @vitest-environment node
// Gate 1's structural checks (ADR 0004), against stub registry entries: each
// planted UI spec breaks one rule, and the failure names that rule and the
// node it found it on.

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
];

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

// A UI spec that passes every structural check.
function clean() {
  return {
    audience: "contractor",
    nodes: [
      node("screen", "Screen", null, null, { audience: "contractor" }),
      node("panel", "Panel", "screen", "body", { title: "Invoice" }),
      node("status", "Tag", "panel", "actions", { label: "Overdue" }),
      node("note", "Tag", "panel", "body", { label: "Due Oct 8" }),
    ],
    states: [],
    actions: [],
  };
}

function check(spec: unknown) {
  return gate1(spec, { entries, audience: "contractor" }).map(
    ({ rule, location }) => [rule, location]
  );
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
    spec.nodes = spec.nodes.filter((n) => n.id !== "screen");
    spec.nodes[0]!.parent = null;
    spec.nodes[0]!.slot = null;

    expect(check(spec)).toEqual([["screen-root", "panel"]]);
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

  it("says in each failure what broke", () => {
    const spec = clean();
    spec.nodes[3]!.slot = "footer";

    expect(gate1(spec, { entries, audience: "contractor" })).toEqual([
      {
        gate: "gate 1",
        rule: "slot-exists",
        location: "note",
        message: 'Panel has no slot "footer"; its slots are body, actions.',
      },
    ]);
  });
});
