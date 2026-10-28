// A screen's declared actions, as its default story carries them for the
// `action-transitions` taste rule (lint/taste/RULES.md, ADR 0011). The rule
// opens the story again with the `screenAction` and `screenOutcome` globals,
// and the preview's ScreenHost then starts in the state the action's Button
// is clicked in, with that state's data and selection, every row of the
// table whose footer holds the Button ticked, and settles the action under
// the fixture variant of that outcome. Written by
// generator/screen-stories.ts from the UI spec.

import type {
  HostedState,
  ScreenHostProps,
  ScreenStateParameters,
} from "../src/index.ts";

export type Outcome = "success" | "failure";

export type ScreenAction = {
  // The action's id in the UI spec.
  name: string;
  // Its Button's literal label, which the rule finds it by; null when the
  // label is bound, not literal.
  label: string | null;
  // The screen state its Button is clicked in: the first one it shows in.
  from: string;
  // For a Button in a DataTable's actions footer, which is disabled until a
  // row is ticked (ADR 0013): which of the tables with actions that state
  // shows, counted from 0 in document order, starts with every row ticked.
  tickRows?: number;
  // The state each outcome enters, and the fixture variant it settles under.
  to: Record<Outcome, HostedState>;
};

export type ScreenActionParameters = { screenActions?: ScreenAction[] };

// Which action to start before, and under which outcome's variant.
export type ScreenActionGlobals = {
  screenAction?: string;
  screenOutcome?: string;
};

// Where a story's host starts when the globals name one of its declared
// actions and an outcome: in the state the action's Button is clicked in,
// with the variant the screen's declared states give it (the default
// variant for the default state), its operations settling under the
// outcome's variant, and the rows of the Button's table ticked when it is
// in one's footer. Undefined otherwise.
export function actionStart(
  {
    screenActions = [],
    screenStates = [],
  }: ScreenActionParameters & ScreenStateParameters,
  { screenAction, screenOutcome }: ScreenActionGlobals
):
  | (Required<Pick<ScreenHostProps, "screenState" | "settleUnder">> &
      Pick<ScreenStateParameters, "tickRows">)
  | undefined {
  const action = screenActions.find(({ name }) => name === screenAction);
  if (!action || (screenOutcome !== "success" && screenOutcome !== "failure")) {
    return undefined;
  }
  const start = screenStates.find(({ name }) => name === action.from);
  return {
    screenState: { name: action.from, fixture: start?.fixture ?? "default" },
    settleUnder: action.to[screenOutcome].fixture,
    ...(action.tickRows !== undefined && { tickRows: action.tickRows }),
  };
}
