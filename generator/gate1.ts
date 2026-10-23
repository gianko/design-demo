// Gate 1 (ADR 0004): the UI spec checked against the registry before any code
// exists. These are its structural checks; each failure names the node id it
// found the problem on, or `(ui spec)` for the spec as a whole. Every check
// runs, so one attempt reports everything it got wrong (ADR 0010).

import type { RegistryEntry } from "../src/registry/entry.ts";
import type { Failure } from "./failure.ts";
import { type UiNode, type UiSpec, wireSchema } from "./ui-spec.ts";

export type Gate1Context = {
  entries: readonly RegistryEntry[];
  // The screen brief's audience.
  audience: string;
};

const whole = "(ui spec)";

export function gate1(raw: unknown, context: Gate1Context): Failure[] {
  let input = raw;
  if (typeof raw === "string") {
    try {
      input = JSON.parse(raw);
    } catch (error) {
      return [
        fail("wire-shape", whole, `Not JSON: ${(error as Error).message}`),
      ];
    }
  }
  // Components are checked by name below, so an unknown one is named on its
  // node rather than failing the shape.
  const parsed = wireSchema().safeParse(input);
  if (!parsed.success) {
    return parsed.error.issues.map((issue) =>
      fail("wire-shape", issue.path.join(".") || whole, issue.message)
    );
  }
  return checks(parsed.data, context);
}

function checks(spec: UiSpec, { entries, audience }: Gate1Context) {
  const failures: Failure[] = [];
  const entryOf = new Map(entries.map((entry) => [entry.name, entry]));
  const byId = new Map<string, UiNode>();

  // Ids are unique.
  for (const node of spec.nodes) {
    if (byId.has(node.id)) {
      failures.push(
        fail("unique-ids", node.id, `Another node already has id "${node.id}".`)
      );
    } else {
      byId.set(node.id, node);
    }
  }

  // One root, and it is a Screen; no Screen anywhere else.
  const roots = spec.nodes.filter((node) => node.parent === null);
  const [root] = roots;
  if (root === undefined) {
    failures.push(
      fail(
        "one-root",
        whole,
        "No node has a null parent; the Screen is the root."
      )
    );
  }
  for (const extra of roots.slice(1)) {
    failures.push(
      fail(
        "one-root",
        extra.id,
        `A second root; only the Screen "${root!.id}" has a null parent.`
      )
    );
  }
  if (root !== undefined && root.component !== "Screen") {
    failures.push(
      fail(
        "screen-root",
        root.id,
        `The root is a ${root.component}, not a Screen.`
      )
    );
  }
  if (root?.slot != null) {
    failures.push(fail("slot-exists", root.id, "The root sits in no slot."));
  }
  for (const node of spec.nodes) {
    if (node.component === "Screen" && node.parent !== null) {
      failures.push(
        fail(
          "screen-root",
          node.id,
          "A Screen is only ever the root, never nested."
        )
      );
    }
  }

  // Parents exist, and following them never loops.
  for (const node of spec.nodes) {
    if (node.parent !== null && !byId.has(node.parent)) {
      failures.push(
        fail(
          "parent-exists",
          node.id,
          `Its parent "${node.parent}" doesn't exist.`
        )
      );
    }
  }
  for (const node of byId.values()) {
    if (inCycle(node, byId)) {
      failures.push(
        fail(
          "no-cycles",
          node.id,
          "Following its parents leads back to itself."
        )
      );
    }
  }

  for (const node of spec.nodes) {
    const entry = entryOf.get(node.component);
    if (entry === undefined) {
      failures.push(
        fail(
          "registered-component",
          node.id,
          `"${node.component}" isn't a registered component.`
        )
      );
      continue;
    }
    const parent = node.parent === null ? undefined : byId.get(node.parent);
    const parentEntry = parent && entryOf.get(parent.component);
    if (parentEntry) failures.push(...slotChecks(node, parentEntry));
    failures.push(...propChecks(node, entry));
  }

  // The audience is the screen brief's, on the spec and on its Screen.
  if (spec.audience !== audience) {
    failures.push(
      fail(
        "audience-match",
        whole,
        `The audience is "${spec.audience}"; the screen brief's is "${audience}".`
      )
    );
  }
  const screenAudience =
    root?.component === "Screen" && propValue(root, "audience");
  if (
    screenAudience &&
    screenAudience.ok &&
    screenAudience.value !== audience
  ) {
    failures.push(
      fail(
        "audience-match",
        root.id,
        `The Screen's audience is ${JSON.stringify(screenAudience.value)}; the screen brief's is "${audience}".`
      )
    );
  }

  return failures;
}

function slotChecks(node: UiNode, parent: RegistryEntry): Failure[] {
  const slots = parent.slots ?? {};
  const names = Object.keys(slots);
  if (names.length === 0) {
    return [
      fail(
        "slot-exists",
        node.id,
        `${parent.name} has no slots, so it takes no children.`
      ),
    ];
  }
  const list = names.join(", ");
  if (node.slot === null) {
    return [
      fail(
        "slot-exists",
        node.id,
        `It names no slot; ${parent.name}'s slots are ${list}.`
      ),
    ];
  }
  const slot = Object.hasOwn(slots, node.slot) ? slots[node.slot] : undefined;
  if (slot === undefined) {
    return [
      fail(
        "slot-exists",
        node.id,
        `${parent.name} has no slot "${node.slot}"; its slots are ${list}.`
      ),
    ];
  }
  if (slot.allow && !slot.allow.includes(node.component)) {
    return [
      fail(
        "slot-allow",
        node.id,
        `${parent.name}'s ${node.slot} slot takes only ${slot.allow.join(", ")}, not ${node.component}.`
      ),
    ];
  }
  return [];
}

function propChecks(node: UiNode, entry: RegistryEntry): Failure[] {
  const failures: Failure[] = [];
  const props: Record<string, unknown> = {};
  let unparsed = false;
  for (const { name, value } of node.props) {
    if (Object.hasOwn(props, name)) {
      failures.push(fail("props-parse", node.id, `"${name}" is given twice.`));
      continue;
    }
    try {
      props[name] = JSON.parse(value);
    } catch {
      unparsed = true;
      failures.push(
        fail("props-parse", node.id, `"${name}" isn't a JSON value: ${value}`)
      );
    }
  }
  // A value that isn't JSON would also read as missing; say it once.
  if (unparsed) return failures;
  const result = entry.props.strict().safeParse(props);
  if (!result.success) {
    for (const issue of result.error.issues) {
      const path = issue.path.join(".");
      failures.push(
        fail(
          "props-parse",
          node.id,
          `${entry.name} ${path ? `"${path}": ` : ""}${issue.message}`
        )
      );
    }
  }
  return failures;
}

function propValue(node: UiNode, name: string) {
  const prop = node.props.find((candidate) => candidate.name === name);
  if (prop === undefined) return undefined;
  try {
    return { ok: true as const, value: JSON.parse(prop.value) as unknown };
  } catch {
    return { ok: false as const };
  }
}

function inCycle(start: UiNode, byId: Map<string, UiNode>) {
  let current = start.parent === null ? undefined : byId.get(start.parent);
  for (let steps = 0; current && steps < byId.size; steps++) {
    if (current === start) return true;
    current = current.parent === null ? undefined : byId.get(current.parent);
  }
  return false;
}

function fail(rule: string, location: string, message: string): Failure {
  return { gate: "gate 1", rule, location, message };
}
