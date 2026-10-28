// A screen brief's pass criteria (ADR 0008): presence only. Every listed
// component, screen state and action appears in the final UI spec; extras are
// fine, and count, order and placement aren't checked. The one exception is
// a transition (ADR 0011, ADR 0013), which is a structural pattern, so its
// check reads placement and `when`.

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
  // An action's Button sits in a DataTable's actions footer, shown in a
  // state the action can be run from; the action's success state shows a
  // success Toast and its failure state a failure Toast (ADR 0013).
  "table-action-to-toast": (spec) => {
    const { states, visibleIn, parentOf } = visibility(spec);
    const toastIn = (state: string, tone: string) =>
      spec.nodes.some(
        (node) =>
          node.component === "Toast" &&
          toneOf(node) === tone &&
          visibleIn(node).includes(state)
      );
    return spec.actions.some(({ name, to }) =>
      spec.nodes.some(
        (button) =>
          button.component === "Button" &&
          button.action === name &&
          button.slot === "actions" &&
          parentOf(button)?.component === "DataTable" &&
          canStartIn(states, to).some((state) =>
            visibleIn(button).includes(state)
          ) &&
          toastIn(to.success, "success") &&
          toastIn(to.failure, "failure")
      )
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
// outcomes.
function canStartIn(states: string[], to: UiSpec["actions"][number]["to"]) {
  return states.filter((state) => state !== to.success && state !== to.failure);
}

// A Toast's literal tone, if it has one.
function toneOf(node: UiNode): unknown {
  const tone = node.props.find((prop) => prop.name === "tone");
  if (tone === undefined) return undefined;
  try {
    return JSON.parse(tone.value);
  } catch {
    return undefined;
  }
}
