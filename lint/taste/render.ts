// What the render-time taste rules share: the shape gate 7 runs them in, and,
// in the page, the visible text under the story root, a short quote of it for
// a failure line, the failing element's place, and the reads several rules
// make: text with its whitespace collapsed, whether a box is visually
// hidden, the background an element reads on, a value as the page computes
// it, and waiting for the page's motion to settle. Page functions can't
// close over Node modules, so `installHelpers` puts these on
// `globalThis.taste` before a rule's page function runs.

import type { Locator, Page } from "@playwright/test";

// One failure of a render-time taste rule: what is wrong, worded so the
// story, theme and density in the test title complete it, and the element it
// is wrong on, as a CSS selector from the story root and its outer HTML, so
// a repair turn can point at it (ADR 0010).
export type RenderFinding = { message: string; selector: string; html: string };

// The story a render shows, for a rule that needs more than its rendered
// page: what the story declares, and fresh renders of it to drive.
export type RenderedStory = {
  id: string;
  // One of the story's parameters, as JSON; undefined when it has none.
  parameter(name: string): Promise<unknown>;
  // The story opened again in a new page of the same browser context, in the
  // same theme, density and viewport, with these globals set as well. The
  // render's own page is left as it was; the caller closes the new one.
  reopen(globals: Record<string, string>): Promise<Page>;
};

// A render-time taste rule. It inspects one rendered story and returns its
// findings. Its help line is its line in RULES.md. A rule that changes the
// page leaves it as it found it: the baseline shot follows.
export type RenderRule = {
  name: string;
  help: string;
  check: (
    page: Page,
    root: string,
    story: RenderedStory
  ) => Promise<RenderFinding[]>;
};

export type VisibleText = {
  node: globalThis.Text;
  element: Element;
  // The text as it reads, whitespace collapsed.
  text: string;
  // The text's line boxes.
  rects: DOMRect[];
};

export type Helpers = {
  texts(root: Element): VisibleText[];
  quote(text: string): string;
  // A finding on `element`.
  at(element: Element, message: string): RenderFinding;
  // The text with its whitespace collapsed and trimmed, as it reads.
  words(text: string): string;
  // Whether `element` is copy only assistive tech reads: it, or a box
  // around it, is clipped the visually hidden way.
  visuallyHidden(element: Element): boolean;
  // Whether a computed colour paints nothing.
  clear(colour: string): boolean;
  // The background `element` reads on: the first fill painted at or above
  // it, or the page role's colour in its theme where none is.
  background(element: Element): string;
  // `value` as the page computes `property` (a CSS property name) under
  // `scope`, read off a probe placed inside it: a token's value in that
  // theme or density, or a colour converted.
  computed(scope: Element, property: string, value: string): string;
  // Waits until no View Transition is active and every animation that ends
  // has ended, including any a finished one starts. Loops never end, so
  // they aren't waited on.
  settle(): Promise<void>;
};

declare global {
  var taste: Helpers;
}

// Runs a rule's page function on the story root, with what it needs from
// Node, if anything.
export async function inPage<Result>(
  page: Page,
  root: string,
  check: (root: Element) => Result
): Promise<Result>;
export async function inPage<Arg, Result>(
  page: Page,
  root: string,
  check: (root: Element, arg: Arg) => Result,
  arg: Arg
): Promise<Result>;
export async function inPage<Arg, Result>(
  page: Page,
  root: string,
  check: (root: Element, arg?: Arg) => Result,
  arg?: Arg
): Promise<Result> {
  await page.evaluate(installHelpers);
  return page
    .locator(root)
    .evaluate(check as (root: Element, arg: unknown) => Result, arg);
}

// Waits for the page's motion to settle (Helpers.settle).
export async function settle(page: Page): Promise<void> {
  await page.evaluate(installHelpers);
  await page.evaluate(() => taste.settle());
}

// A finding on the element `locator` points at.
export async function findingAt(
  page: Page,
  locator: Locator,
  message: string
): Promise<RenderFinding> {
  await page.evaluate(installHelpers);
  return locator.evaluate(
    (element, message) => taste.at(element, message),
    message
  );
}

function installHelpers() {
  globalThis.taste = {
    texts(root) {
      const texts: VisibleText[] = [];
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      for (let node = walker.nextNode(); node; node = walker.nextNode()) {
        const text = taste.words(node.textContent!);
        const element = node.parentElement;
        if (!text || !element) continue;
        if (!element.checkVisibility({ visibilityProperty: true })) continue;
        if (taste.visuallyHidden(element)) continue;
        const range = document.createRange();
        range.selectNodeContents(node);
        const rects = [...range.getClientRects()].filter(
          (rect) => rect.width > 0 && rect.height > 0
        );
        if (rects.length === 0) continue;
        texts.push({ node: node as globalThis.Text, element, text, rects });
      }
      return texts;
    },
    words(text) {
      return text.replace(/\s+/g, " ").trim();
    },
    // The visually hidden pattern, as Tailwind's `sr-only` and Screen's
    // status region draw it, either half of it: the clip that halves the
    // box from every side (`clip-path: inset(50%)`, or the older
    // `clip: rect(0 0 0 0)`), or a box of at most 1px that hides its
    // overflow. A clip that leaves no area some other way, such as a wipe
    // that ends clipped away, isn't the pattern.
    visuallyHidden(element) {
      for (let box: Element | null = element; box; box = box.parentElement) {
        const style = getComputedStyle(box);
        if (style.clipPath === "inset(50%)") return true;
        if (style.clip === "rect(0px, 0px, 0px, 0px)") return true;
        const { width, height } = box.getBoundingClientRect();
        if (
          width <= 1 &&
          height <= 1 &&
          style.overflowX !== "visible" &&
          style.overflowY !== "visible"
        ) {
          return true;
        }
      }
      return false;
    },
    clear(colour) {
      return (
        colour === "transparent" ||
        /^rgba\(.*,\s*0\)$/.test(colour) ||
        /\/\s*0\)$/.test(colour)
      );
    },
    background(element) {
      for (let box: Element | null = element; box; box = box.parentElement) {
        const fill = getComputedStyle(box).backgroundColor;
        if (!taste.clear(fill)) return fill;
      }
      return taste.computed(
        element.closest("[data-theme]") ?? document.documentElement,
        "background-color",
        "var(--ds-color-bg-page)"
      );
    },
    computed(scope, property, value) {
      const probe = document.createElement("span");
      probe.hidden = true;
      probe.style.setProperty(property, value);
      scope.append(probe);
      const read = getComputedStyle(probe).getPropertyValue(property);
      probe.remove();
      return read;
    },
    async settle() {
      const frame = () =>
        new Promise((resolve) => requestAnimationFrame(resolve));
      for (let round = 0; round < 20; round++) {
        await frame();
        await frame();
        const ending = document
          .getAnimations()
          .filter(
            (animation) =>
              animation.playState === "running" &&
              animation.effect?.getComputedTiming().endTime !== Infinity
          );
        const transitioning = document.documentElement.matches(
          ":active-view-transition"
        );
        if (ending.length === 0 && !transitioning) return;
        await Promise.all(
          ending.map((animation) => animation.finished.catch(() => undefined))
        );
      }
    },
    quote(text) {
      return JSON.stringify(text.length > 40 ? `${text.slice(0, 39)}…` : text);
    },
    at(element, message) {
      return { message, selector: selector(element), html: element.outerHTML };

      // A child-combinator path up to the nearest element with an id (the
      // story root), each step its tag, its component marker and, among
      // same-tag siblings, its position.
      function selector(element: Element) {
        const steps: string[] = [];
        for (let box: Element | null = element; box; box = box.parentElement) {
          if (box.id) {
            steps.unshift(`#${CSS.escape(box.id)}`);
            break;
          }
          const { tagName, parentElement } = box;
          let step = tagName.toLowerCase();
          const component = box.getAttribute("data-component");
          if (component) step += `[data-component="${component}"]`;
          const siblings = [...(parentElement?.children ?? [])].filter(
            (sibling) => sibling.tagName === tagName
          );
          if (siblings.length > 1) {
            step += `:nth-of-type(${siblings.indexOf(box) + 1})`;
          }
          steps.unshift(step);
        }
        return steps.join(" > ");
      }
    },
  };
}
