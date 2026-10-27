// What the render-time taste rules that drive a screen's declared actions
// share (`action-transitions`, `motion-reduced`): the actions a story
// declares, the globals that open it again before one of them under an
// outcome, finding and clicking the action's Button by its literal label,
// and how long its operation may take to settle.

import type { Locator, Page } from "@playwright/test";
import type {
  Outcome,
  ScreenAction,
  ScreenActionGlobals,
  ScreenActionParameters,
} from "../../.storybook/screen-actions.ts";
import { operationDelayMs } from "../../src/fixtures/fixtures.ts";
import type { RenderedStory } from "./render.ts";

export const outcomes: Outcome[] = ["success", "failure"];

// How long after the click an action's operation may take to settle, with
// room for a loaded machine.
export const settleMs = operationDelayMs + 4000;

// The actions the story declares in its `screenActions` parameter (a kept or
// generated screen's default story, .storybook/screen-actions.ts).
export async function declaredActions(
  story: RenderedStory
): Promise<ScreenAction[]> {
  const actions = (await story.parameter(
    "screenActions"
  )) as ScreenActionParameters["screenActions"];
  return actions ?? [];
}

// The globals that open the story in the state `action`'s Button is clicked
// in, settling under `outcome`'s fixture variant.
export function actionGlobals(
  action: ScreenAction,
  outcome: Outcome
): Required<ScreenActionGlobals> {
  return { screenAction: action.name, screenOutcome: outcome };
}

// The story opened again before `action`, under `outcome`; the caller
// closes it.
export function reopenBefore(
  story: RenderedStory,
  action: ScreenAction,
  outcome: Outcome
): Promise<Page> {
  return story.reopen(actionGlobals(action, outcome));
}

// The Buttons labelled `label` exactly under the story root.
export function actionButton(page: Page, root: string, label: string): Locator {
  return page.locator(root).getByRole("button", { name: label, exact: true });
}

// Clicks the first of `button`, waiting as long as an operation may take for
// it to be clickable; false when it never was (disabled, hidden or covered).
export async function clickAction(button: Locator): Promise<boolean> {
  try {
    await button.first().click({ timeout: settleMs });
    return true;
  } catch {
    return false;
  }
}

export function quote(text: string) {
  return JSON.stringify(text);
}
