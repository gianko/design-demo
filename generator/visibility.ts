// Which screen states a UI spec's node shows in (ADR 0004): its own `when`,
// or every state when that's empty, within its parent's. Gate 1 and the pass
// criteria both read a UI spec this way.

import { defaultState } from "../src/components/Screen/default-state.ts";
import type { UiNode, UiSpec } from "./ui-spec.ts";

export type Visibility = {
  // The default state, then each declared one, once each.
  states: string[];
  // The node's parent, by id; the first node with an id wins.
  parentOf: (node: UiNode) => UiNode | undefined;
  visibleIn: (node: UiNode) => string[];
};

export function visibility(
  spec: UiSpec,
  byId: Map<string, UiNode> = firstById(spec)
): Visibility {
  const states = [
    ...new Set([defaultState, ...spec.states.map(({ name }) => name)]),
  ];
  const parentOf = (node: UiNode) =>
    node.parent === null ? undefined : byId.get(node.parent);

  const known = new Map<UiNode, string[]>();
  // A parent loop ends the walk where it closes.
  const visibleIn = (node: UiNode, seen = new Set<UiNode>()): string[] => {
    const cached = known.get(node);
    if (cached) return cached;
    seen.add(node);
    let shown =
      node.when.length === 0
        ? states
        : states.filter((state) => node.when.includes(state));
    const parent = parentOf(node);
    if (parent && !seen.has(parent)) {
      const above = visibleIn(parent, seen);
      shown = shown.filter((state) => above.includes(state));
    }
    known.set(node, shown);
    return shown;
  };
  return { states, parentOf, visibleIn: (node) => visibleIn(node) };
}

function firstById(spec: UiSpec) {
  const byId = new Map<string, UiNode>();
  for (const node of spec.nodes) {
    if (!byId.has(node.id)) byId.set(node.id, node);
  }
  return byId;
}
