// `action-transitions` (lint/taste/RULES.md). Origin: new; impeccable has no
// such rule. Motion confirms what the user did (ADR 0011): an action's
// result is shown only once its operation settles, and through a View
// Transition typed for it, `confirm` on success and `fail` on failure, so
// `ease-settle` follows only a confirmed result. A story declares its
// screen's actions in its `screenActions` parameter (a kept or generated
// screen's default story, .storybook/screen-actions.ts). For each action and
// each outcome, this opens the story again starting in the state its Button
// is clicked in, with that state's data and selection and its operations
// settling under the outcome's fixture variant, clicks the Button by
// its literal label, and checks the screen enters the outcome's state through
// a View Transition of the outcome's type. Whether the motion looks right is
// gated in the library's own stories.

import type { Page } from "@playwright/test";
import type {
  Outcome,
  ScreenAction,
  ScreenActionGlobals,
  ScreenActionParameters,
} from "../../../.storybook/screen-actions.ts";
import { operationDelayMs } from "../../../src/fixtures/fixtures.ts";
import type { TransitionType } from "../../../src/components/Screen/screen-state.tsx";
import {
  findingAt,
  type RenderFinding,
  type RenderRule,
  type RenderedStory,
} from "../render.ts";
import { help } from "../rules-md.ts";

export const id = "action-transitions";

export const render: RenderRule = {
  name: id,
  help: help(id),
  check: async (_page, root, story) => {
    const actions = (await story.parameter(
      "screenActions"
    )) as ScreenActionParameters["screenActions"];
    // A Button missing under both outcomes is one finding.
    const findings = new Map<string, RenderFinding>();
    for (const action of actions ?? []) {
      for (const outcome of outcomes) {
        for (const finding of await clickThrough(
          story,
          root,
          action,
          outcome
        )) {
          findings.set(`${finding.message} at ${finding.selector}`, finding);
        }
      }
    }
    return [...findings.values()];
  },
};

const outcomes: Outcome[] = ["success", "failure"];

const typeOf: Record<Outcome, TransitionType> = {
  success: "confirm",
  failure: "fail",
};

// How long after the click the operation may take to settle, with room for
// a loaded machine.
const settleMs = operationDelayMs + 4000;

// A View Transition the screen started, and the state it left the screen in.
type Started = { types: string[]; state?: string | null };

async function clickThrough(
  story: RenderedStory,
  root: string,
  action: ScreenAction,
  outcome: Outcome
): Promise<RenderFinding[]> {
  const globals: Required<ScreenActionGlobals> = {
    screenAction: action.name,
    screenOutcome: outcome,
  };
  const page = await story.reopen(globals);
  try {
    const button = page
      .locator(root)
      .getByRole("button", { name: action.label ?? "", exact: true });
    if (action.label === null || (await button.count()) === 0) {
      const label =
        action.label === null ? "with a literal label" : quote(action.label);
      return [
        await findingAt(
          page,
          page.locator(root),
          `No Button labelled ${label} to click for ${action.name} in state ${quote(action.from)}`
        ),
      ];
    }
    const at = await findingAt(page, button.first(), "");
    await page.evaluate(recordTransitions);
    try {
      await button.first().click({ timeout: settleMs });
    } catch {
      // Disabled, hidden or covered.
      return [
        {
          ...at,
          message: `Couldn't click ${quote(action.label)} for ${action.name} in state ${quote(action.from)}`,
        },
      ];
    }
    const started = await settled(page, action.from);

    const expected = action.to[outcome].name;
    const type = typeOf[outcome];
    const entered = started.find(
      (transition) =>
        transition.types.length > 0 || transition.state !== action.from
    );
    if (entered?.state === expected && entered.types.includes(type)) return [];
    const how = !entered
      ? undefined
      : entered.types.length === 0
        ? "an untyped View Transition"
        : `a View Transition typed ${entered.types.map(quote).join(", ")}`;
    const was = how
      ? `${quote(entered!.state ?? "no state")} through ${how}, not ${quote(expected)} through one typed ${quote(type)}`
      : `no state, not ${quote(expected)} through a View Transition typed ${quote(type)}`;
    return [
      {
        ...at,
        message: `Clicking ${quote(action.label)} under ${action.name}'s ${outcome} variant entered ${was}`,
      },
    ];
  } finally {
    await page.close();
  }
}

declare global {
  var __gateTransitions: Started[] | undefined;
}

// In the page: records each View Transition the screen starts, with its
// types and the screen state its update leaves.
function recordTransitions() {
  const started: Started[] = [];
  globalThis.__gateTransitions = started;
  const start = document.startViewTransition.bind(document);
  document.startViewTransition = ((
    options?: ViewTransitionUpdateCallback | StartViewTransitionOptions
  ) => {
    const record: Started = {
      types:
        typeof options === "object" && options?.types ? [...options.types] : [],
    };
    started.push(record);
    const transition = start(options);
    transition.updateCallbackDone.finally(() => {
      record.state =
        document
          .querySelector("[data-component=Screen]")
          ?.getAttribute("data-screen-state") ?? null;
    });
    return transition;
  }) as typeof document.startViewTransition;
}

// The View Transitions started once one has entered a state or carried a
// type, or once the operation has had time to settle.
async function settled(page: Page, from: string): Promise<Started[]> {
  await page
    .waitForFunction(
      (from) =>
        globalThis.__gateTransitions!.some(
          ({ types, state }) =>
            state !== undefined && (types.length > 0 || state !== from)
        ),
      from,
      { timeout: settleMs }
    )
    .catch(() => {});
  return page.evaluate(() =>
    globalThis.__gateTransitions!.filter(({ state }) => state !== undefined)
  );
}

function quote(text: string) {
  return JSON.stringify(text);
}
