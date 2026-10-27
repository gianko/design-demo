// A screen brief's pass criteria (ADR 0008): presence only. Every listed
// component, screen state and action appears in the final UI spec; extras are
// fine, and count, order and placement aren't checked. The one exception is
// a transition (ADR 0011), which is a structural pattern, so its check reads
// placement and `when`.

import type { ScreenBrief, Transition } from "./screen-brief.ts";
import type { UiNode, UiSpec } from "./ui-spec.ts";
import { visibility } from "./visibility.ts";

export type CriteriaResult = { met: boolean; missing: string[] };

export function checkPassCriteria(
  requires: ScreenBrief["requires"],
  uiSpec: UiSpec | undefined
): CriteriaResult {
  const present = {
    component: new Set(uiSpec?.nodes.map((node) => node.component)),
    state: new Set(uiSpec?.states.map((state) => state.name)),
    action: new Set(uiSpec?.actions.map((action) => action.name)),
  };
  const missing = [
    ...requires.components
      .filter((name) => !present.component.has(name))
      .map((name) => `component ${name}`),
    ...requires.states
      .filter((name) => !present.state.has(name))
      .map((name) => `state ${name}`),
    ...requires.actions
      .filter((name) => !present.action.has(name))
      .map((name) => `action ${name}`),
    ...requires.transitions
      .filter((name) => !uiSpec || !transitionChecks[name](uiSpec))
      .map((name) => `transition ${name}`),
  ];
  return { met: uiSpec !== undefined && missing.length === 0, missing };
}

const transitionChecks: Record<Transition, (spec: UiSpec) => boolean> = {
  // An action's Button sits in an ActionBar shown while the action can be
  // run; the action's success state shows a Toast and not that bar, so the
  // bar becomes the toast.
  "bar-to-toast": (spec) => {
    const { states, visibleIn, parentOf } = visibility(spec);
    return spec.actions.some(({ name, to }) =>
      spec.nodes.some((button) => {
        if (button.component !== "Button" || button.action !== name) {
          return false;
        }
        const bar = ancestors(button, parentOf).find(
          (node) => node.component === "ActionBar"
        );
        return (
          bar !== undefined &&
          canStartIn(states, to).some((state) =>
            visibleIn(button).includes(state)
          ) &&
          !visibleIn(bar).includes(to.success) &&
          spec.nodes.some(
            (node) =>
              node.component === "Toast" && visibleIn(node).includes(to.success)
          )
        );
      })
    );
  },
  // A DataTable's detail slot holds a Sheet.
  "row-to-sheet": (spec) => {
    const { parentOf } = visibility(spec);
    return spec.nodes.some(
      (node) =>
        node.component === "Sheet" &&
        node.slot === "detail" &&
        parentOf(node)?.component === "DataTable"
    );
  },
};

// The states an action can be run from, before it has ever run: not its own
// outcomes, and on a screen with a Selection only `rows-selected`, since the
// bulk-action bar acts on the ticked rows (ADR 0011).
function canStartIn(states: string[], to: UiSpec["actions"][number]["to"]) {
  const started = states.filter(
    (state) => state !== to.success && state !== to.failure
  );
  return started.includes(rowsSelected) ? [rowsSelected] : started;
}

const rowsSelected = "rows-selected";

// A node's parent, its parent's parent and so on, stopping at a loop.
function ancestors(
  node: UiNode,
  parentOf: (node: UiNode) => UiNode | undefined
): UiNode[] {
  const seen = new Set<UiNode>([node]);
  const found: UiNode[] = [];
  for (let at = parentOf(node); at && !seen.has(at); at = parentOf(at)) {
    seen.add(at);
    found.push(at);
  }
  return found;
}
