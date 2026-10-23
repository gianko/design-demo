// What the render-time taste rules share: the shape gate 7 runs them in, and,
// in the page, the visible text under the story root and a short quote of it
// for a failure line. Page functions can't close over Node modules, so
// `installHelpers` puts these on `globalThis.taste` before a rule's page
// function runs.

import type { Page } from "@playwright/test";

// A render-time taste rule. It inspects one rendered story and returns its
// failures, one line each, worded so the story, theme and density in the test
// title complete them. Its help line is its line in RULES.md.
export type RenderRule = {
  name: string;
  help: string;
  check: (page: Page, root: string) => Promise<string[]>;
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
    quote(text) {
      return JSON.stringify(text.length > 40 ? `${text.slice(0, 39)}…` : text);
    },
  };
}
