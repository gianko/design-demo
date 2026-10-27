// `motion-reduced` (lint/taste/RULES.md). Origin: new; impeccable has no such
// rule. Someone who asked for reduced motion sees every change as a `fast`
// crossfade: nothing moves, overshoots or staggers (the design brief, ADR
// 0011). The motion is the library's, and most of it runs only when the
// story changes, so this opens the story again under `reducedMotion:
// 'reduce'` and drives what the library animates, recording every animation
// and transition that runs inside the story and every View Transition
// pseudo-element's:
//
// - on load: what the story starts or loops (a mount's View Transition, the
//   stagger, a pending sweep);
// - a table whose rows open a Sheet: opening the first row's, then closing
//   it with Escape (row → sheet); a story that loads with a Sheet open only
//   closes it;
// - a screen's declared actions (its `screenActions` parameter, as
//   `action-transitions` reads it): clicking each one's Button in its start
//   state, settling under each outcome's fixture variant (bar → toast, the
//   failure toast); a story that
//   declares none has each Button in an ActionBar clicked instead.
//
// Each drive runs in a page of its own, so the render's page, which the
// baseline shot reads next, never leaves its media or state.
//
// An animation fails when it animates a property other than opacity, or when
// it runs, delay included, longer than `fast`; one that never ends runs
// forever. Colour changes move nothing, so a `fast` colour transition (a
// row's hover) passes, and `mix-blend-mode` is the browser's own crossfade
// plumbing on a View Transition's images.

import type { Locator, Page } from "@playwright/test";
import {
  inPage,
  settle,
  type RenderFinding,
  type RenderRule,
  type RenderedStory,
} from "../render.ts";
import { help } from "../rules-md.ts";
import {
  actionButton,
  actionGlobals,
  clickAction,
  declaredActions,
  outcomes,
  quote,
  settleMs,
} from "../screen-actions.ts";

export const id = "motion-reduced";

export const render: RenderRule = {
  name: id,
  help: help(id),
  check: async (page, root, story) => {
    const findings = new Map<string, RenderFinding>();
    const add = (found: RenderFinding[]) => {
      for (const finding of found) {
        findings.set(`${finding.message} at ${finding.selector}`, finding);
      }
    };

    add(await drive(story, root, {}, (reduced) => rowToSheet(reduced, root)));

    const actions = await declaredActions(story);
    if (actions.length) {
      for (const action of actions) {
        const { label } = action;
        if (label === null) continue;
        for (const outcome of outcomes) {
          add(
            await drive(
              story,
              root,
              actionGlobals(action, outcome),
              (reduced) =>
                click(
                  reduced,
                  actionButton(reduced, root, label),
                  `Clicking ${quote(label)} under ${action.name}'s ${outcome} variant`
                )
            )
          );
        }
      }
    } else {
      // Read off the render's own page, which reading doesn't change.
      const labels = await page
        .locator(root)
        .locator(barButtons)
        .evaluateAll((buttons) =>
          buttons.map((button) => button.textContent!.trim())
        );
      for (const label of new Set(labels)) {
        add(
          await drive(story, root, {}, (reduced) =>
            click(
              reduced,
              reduced
                .locator(root)
                .locator(barButtons)
                .filter({ hasText: label }),
              `Clicking ${quote(label)}`
            )
          )
        );
      }
    }
    return [...findings.values()];
  },
};

// The Buttons an ActionBar holds that a click can run.
const barButtons =
  '[data-component="ActionBar"] [data-component="Button"]:not([disabled], [aria-busy="true"])';

// One recorded animation or transition, and the drive it ran under.
type Ran = {
  step: string;
  // The element it runs on, or the document's root for a View Transition
  // pseudo-element.
  target: Element | null;
  pseudo: string | null;
  // Whether it ran inside the story, or on a View Transition pseudo-element,
  // when it started: a Sheet's content is gone once the Sheet closes.
  inStory: boolean;
  // The CSS animation's name or the transitioned property; empty for a
  // script's own animation.
  name: string;
  transition: boolean;
  properties: string[];
  // Delay plus active duration, in ms; Infinity for a loop.
  endTime: number;
};

declare global {
  var __motionReduced: { step: string; ran: Ran[] } | undefined;
}

// Opens the story again under reduced motion, from its first frame, lets it
// settle, runs `act` on it, and returns the findings over everything that
// ran.
async function drive(
  story: RenderedStory,
  root: string,
  globals: Record<string, string>,
  act: (page: Page) => Promise<void>
): Promise<RenderFinding[]> {
  const page = await story.reopen(globals);
  try {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.addInitScript(record, root);
    // From the first frame, under the emulated media, so motion a story
    // runs as it mounts is recorded too.
    await page.reload();
    await page.locator(`${root} > *`).first().waitFor({ state: "attached" });
    await page.evaluate(() => document.fonts.ready.then(() => undefined));
    await settle(page);
    await act(page);
    return await inPage(page, root, findings);
  } finally {
    await page.close();
  }
}

async function step(page: Page, name: string) {
  await page.evaluate((name) => {
    globalThis.__motionReduced!.step = name;
  }, name);
}

// Row → sheet: opens the first row's Sheet, unless one is open already, and
// closes it with Escape.
async function rowToSheet(page: Page, root: string) {
  const open = page.locator(root).locator("dialog:modal");
  const row = page
    .locator(root)
    .locator('[data-component="DataTable"] tbody tr[tabindex="0"]')
    .first();
  if ((await open.count()) === 0 && (await row.count()) > 0) {
    await step(page, "Opening a row's Sheet");
    await row.click();
    await settle(page);
  }
  if ((await open.count()) > 0) {
    await step(page, "Closing the Sheet with Escape");
    await page.keyboard.press("Escape");
    await settle(page);
  }
}

// Clicks `button` and waits for what it runs to settle: an action holds its
// Button pending until its operation settles.
async function click(page: Page, button: Locator, name: string) {
  if ((await button.count()) === 0) return;
  await step(page, name);
  // Not clickable: action-transitions reports it.
  if (!(await clickAction(button))) return;
  await page.evaluate(frames, 2);
  await page
    .waitForFunction(() => !document.querySelector('[aria-busy="true"]'), {
      timeout: settleMs,
    })
    .catch(() => {});
  await settle(page);
}

// In the page: two animation frames.
function frames(count: number) {
  return new Promise<void>((resolve) => {
    const next = (left: number) =>
      left === 0 ? resolve() : requestAnimationFrame(() => next(left - 1));
    next(count);
  });
}

// In the page, from its first script: records every animation and
// transition the document runs, polled each frame, with the drive it ran
// under. `root` is the story root's selector.
function record(root: string) {
  const seen = new WeakSet<Animation>();
  const log = { step: "On load", ran: [] as Ran[] };
  globalThis.__motionReduced = log;
  const skip = ["offset", "computedOffset", "easing", "composite"];
  const poll = () => {
    for (const animation of document.getAnimations()) {
      if (seen.has(animation)) continue;
      seen.add(animation);
      const effect = animation.effect as KeyframeEffect | null;
      const transition =
        typeof CSSTransition !== "undefined" &&
        animation instanceof CSSTransition;
      const name = transition
        ? (animation as CSSTransition).transitionProperty
        : animation instanceof CSSAnimation
          ? animation.animationName
          : "";
      const properties = transition
        ? [name]
        : [
            ...new Set(
              (effect?.getKeyframes() ?? []).flatMap((keyframe) =>
                Object.keys(keyframe).filter((key) => !skip.includes(key))
              )
            ),
          ].map((key) => key.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`));
      const target = effect?.target ?? null;
      const pseudo = effect?.pseudoElement ?? null;
      log.ran.push({
        step: log.step,
        target,
        pseudo,
        inStory:
          (target === document.documentElement &&
            Boolean(pseudo?.startsWith("::view-transition"))) ||
          Boolean(target?.closest(root)),
        name,
        transition,
        properties,
        endTime: Number(effect?.getComputedTiming().endTime ?? 0),
      });
    }
    requestAnimationFrame(poll);
  };
  requestAnimationFrame(poll);
}

// In the page: a finding for each recorded animation inside the story, or
// on a View Transition pseudo-element, that moves something or runs past
// `fast`.
function findings(): RenderFinding[] {
  // The token, in ms; the built CSS may write it in seconds.
  const token = getComputedStyle(document.documentElement)
    .getPropertyValue("--ds-motion-duration-fast")
    .trim();
  const fast = parseFloat(token) * (token.endsWith("ms") ? 1 : 1000);
  if (Number.isNaN(fast)) {
    throw new Error("motion-reduced: no --ds-motion-duration-fast token.");
  }
  // What a crossfade may animate: opacity, and what moves nothing.
  const still = (property: string) =>
    property === "opacity" ||
    property === "mix-blend-mode" ||
    property.endsWith("color") ||
    property === "fill" ||
    property === "stroke";
  const failures: RenderFinding[] = [];
  for (const ran of globalThis.__motionReduced!.ran) {
    if (!ran.inStory) continue;
    const viewTransition = ran.target === document.documentElement;
    const what = ran.transition
      ? `the ${ran.name} transition`
      : ran.name
        ? `the ${JSON.stringify(ran.name)} animation`
        : "a scripted animation";
    const at = (message: string) =>
      viewTransition
        ? { message, selector: `:root${ran.pseudo}`, html: ran.pseudo! }
        : taste.at(ran.target!, message);
    const moving = ran.properties.filter((property) => !still(property));
    if (moving.length > 0) {
      failures.push(
        at(
          `${ran.step}, ${what} moves ${moving.join(", ")} under reduced motion`
        )
      );
    }
    if (ran.endTime > fast) {
      const runs =
        ran.endTime === Infinity
          ? "runs forever"
          : `runs ${Math.round(ran.endTime)}ms`;
      failures.push(
        at(
          `${ran.step}, ${what} ${runs} under reduced motion, longer than fast (${fast}ms)`
        )
      );
    }
  }
  return failures;
}
