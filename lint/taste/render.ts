// What the render-time taste rules share: the shape gate 7 runs them in, and,
// in the page, the visible text under the story root, a short quote of it for
// a failure line, and the failing element's place. Page functions can't close
// over Node modules, so `installHelpers` puts these on `globalThis.taste`
// before a rule's page function runs.

import type { Page } from "@playwright/test";

// One failure of a render-time taste rule: what is wrong, worded so the
// story, theme and density in the test title complete it, and the element it
// is wrong on, as a CSS selector from the story root and its outer HTML, so
// a repair turn can point at it (ADR 0010).
export type RenderFinding = { message: string; selector: string; html: string };

// A render-time taste rule. It inspects one rendered story and returns its
// findings. Its help line is its line in RULES.md.
export type RenderRule = {
  name: string;
  help: string;
  check: (page: Page, root: string) => Promise<RenderFinding[]>;
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

function installHelpers() {
  globalThis.taste = {
    texts(root) {
      const texts: VisibleText[] = [];
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      for (let node = walker.nextNode(); node; node = walker.nextNode()) {
        const text = node.textContent!.replace(/\s+/g, " ").trim();
        const element = node.parentElement;
        if (!text || !element) continue;
        if (!element.checkVisibility({ visibilityProperty: true })) continue;
        if (visuallyHidden(element)) continue;
        const range = document.createRange();
        range.selectNodeContents(node);
        const rects = [...range.getClientRects()].filter(
          (rect) => rect.width > 0 && rect.height > 0
        );
        if (rects.length === 0) continue;
        texts.push({ node: node as globalThis.Text, element, text, rects });
      }
      return texts;

      // Copy only assistive tech reads, as in Screen's status region:
      // something around it clips it to nothing, with a clip that leaves no
      // area or a 1px box that hides its overflow, so no one sees its type
      // or where it runs.
      function visuallyHidden(element: Element) {
        for (let box: Element | null = element; box; box = box.parentElement) {
          const style = getComputedStyle(box);
          if (style.clipPath === "inset(50%)") return true;
          if (style.clip === "rect(0px, 0px, 0px, 0px)") return true;
          const rect = box.getBoundingClientRect();
          if (
            style.overflowX !== "visible" &&
            style.overflowY !== "visible" &&
            rect.width <= 1 &&
            rect.height <= 1
          ) {
            return true;
          }
        }
        return false;
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
