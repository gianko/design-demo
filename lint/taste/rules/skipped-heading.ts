// `skipped-heading` (lint/taste/RULES.md). Origin: impeccable's
// `skipped-heading`
// (https://github.com/pbakaus/impeccable/blob/dad8dbb3aac21ad1fa236c110315ef4abece23e8/crates/foundation/src/registry.rs#L444),
// Apache 2.0, read at commit dad8dbb; reimplemented, no code copied.
// The outline a screen reader hears steps down one level at a time. Each
// heading is held only to the one before it, so a story fragment may start
// at any level, and climbing back up skips nothing. Gate 1 holds a UI spec's
// Heading nodes to the same order; this holds what renders, raw headings and
// `role="heading"` included.

import { inPage, type RenderFinding, type RenderRule } from "../render.ts";
import { help } from "../rules-md.ts";

export const id = "skipped-heading";

export const render: RenderRule = {
  name: id,
  help: help(id),
  check: (page, root) => inPage(page, root, skippedLevels),
};

// In the page: each heading, in document order, more than one level deeper
// than the heading before it. A heading hidden from everyone isn't in the
// outline; a visually hidden one is, as assistive tech still reads it.
function skippedLevels(root: Element): RenderFinding[] {
  const failures: RenderFinding[] = [];
  let before: { level: number; text: string } | undefined;
  for (const element of root.querySelectorAll(
    "h1, h2, h3, h4, h5, h6, [role=heading]"
  )) {
    const role = element.getAttribute("role");
    if (role !== null && role !== "heading") continue;
    if (element.closest("[aria-hidden=true]")) continue;
    if (!element.checkVisibility({ visibilityProperty: true })) continue;
    const level = levelOf(element);
    const text = taste.words(element.textContent!);
    if (before && level > before.level + 1) {
      failures.push(
        taste.at(
          element,
          `${taste.quote(text)} is level ${level}, after level ${before.level} ${taste.quote(before.text)}.`
        )
      );
    }
    before = { level, text };
  }
  return failures;

  // `aria-level` wins over the tag; a `role="heading"` without one is level
  // 2, as ARIA defines it.
  function levelOf(element: Element) {
    const aria = Number(element.getAttribute("aria-level"));
    if (Number.isInteger(aria) && aria > 0) return aria;
    const tag = /^H([1-6])$/.exec(element.tagName);
    return tag ? Number(tag[1]) : 2;
  }
}
