// A screen brief's pass criteria (ADR 0008): presence only. Every listed
// component, screen state and action appears in the final UI spec; extras are
// fine, and count, order and placement aren't checked.

import type { ScreenBrief } from "./screen-brief.ts";
import type { UiSpec } from "./ui-spec.ts";

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
  ];
  return { met: uiSpec !== undefined && missing.length === 0, missing };
}
