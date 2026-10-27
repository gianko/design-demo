// A screen's declared actions, as its default story carries them for the
// `action-transitions` taste rule (lint/taste/RULES.md, ADR 0011). The rule
// opens the story again with the `screenAction` and `screenOutcome` globals,
// and the preview's ScreenHost then starts in the state the action's Button
// is clicked in, under the fixture variant of that outcome. Written by
// generator/screen-stories.ts from the UI spec.

import type { HostedState } from "../src/index.ts";

export type Outcome = "success" | "failure";

export type ScreenAction = {
  // The action's id in the UI spec.
  name: string;
  // Its Button's literal label, which the rule finds it by; null when the
  // label is bound, not literal.
  label: string | null;
  // The screen state its Button is clicked in: the first one it shows in.
  from: string;
  // The state each outcome enters, and the fixture variant it settles under.
  to: Record<Outcome, HostedState>;
};

export type ScreenActionParameters = { screenActions?: ScreenAction[] };

// Which action to start before, and under which outcome's variant.
export type ScreenActionGlobals = {
  screenAction?: string;
  screenOutcome?: string;
};

// The state a story's host starts in when the globals name one of its
// declared actions and an outcome; undefined otherwise.
export function actionStart(
  { screenActions = [] }: ScreenActionParameters,
  { screenAction, screenOutcome }: ScreenActionGlobals
): HostedState | undefined {
  const action = screenActions.find(({ name }) => name === screenAction);
  if (!action || (screenOutcome !== "success" && screenOutcome !== "failure")) {
    return undefined;
  }
  return { name: action.from, fixture: action.to[screenOutcome].fixture };
}
