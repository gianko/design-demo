// `text-overflow` (lint/taste/RULES.md). Origin: impeccable's `text-overflow`
// (https://github.com/pbakaus/impeccable/blob/dad8dbb3aac21ad1fa236c110315ef4abece23e8/crates/foundation/src/registry.rs#L534),
// kept; Apache 2.0, read at commit dad8dbb; reimplemented, no code copied.
// Each visible text's line boxes are held to the box that lays it out (its
// nearest non-inline ancestor) and to every clipping box above that, and to
// every other text's line boxes. Text may run past a box that scrolls, or
// past one that clips it with an ellipsis (or a line clamp), but never
// silently.

import { inPage, type RenderFinding, type RenderRule } from "../render.ts";
import { help } from "../rules-md.ts";

export const id = "text-overflow";

export const render: RenderRule = {
  name: id,
  help: help(id),
  check: (page, root) => inPage(page, root, overflowing),
};

function overflowing(root: Element): RenderFinding[] {
  const failures: RenderFinding[] = [];
  // Sub-pixel layout rounding is not overflow.
  const slack = 1;
  const texts = taste.texts(root);

  for (const { element, text, rects } of texts) {
    const bounds = {
      left: Math.min(...rects.map((r) => r.left)),
      top: Math.min(...rects.map((r) => r.top)),
      right: Math.max(...rects.map((r) => r.right)),
      bottom: Math.max(...rects.map((r) => r.bottom)),
    };
    // The text's excess past a box's padding edge, per axis.
    const excess = (box: Element) => {
      const rect = box.getBoundingClientRect();
      const style = getComputedStyle(box);
      const left = rect.left + parseFloat(style.borderLeftWidth);
      const right = rect.right - parseFloat(style.borderRightWidth);
      const top = rect.top + parseFloat(style.borderTopWidth);
      const bottom = rect.bottom - parseFloat(style.borderBottomWidth);
      return {
        x: bounds.left < left - slack || bounds.right > right + slack,
        y: bounds.top < top - slack || bounds.bottom > bottom + slack,
      };
    };

    let layout: Element = element;
    while (
      layout !== root &&
      ["inline", "contents"].includes(getComputedStyle(layout).display) &&
      layout.parentElement
    ) {
      layout = layout.parentElement;
    }

    let failure: string | null = null;
    for (
      let box: Element | null = layout;
      box && !failure;
      box = box.parentElement
    ) {
      const style = getComputedStyle(box);
      const { x, y } = excess(box);
      if (!x && !y) {
        if (box === root) break;
        continue;
      }
      const clips = (overflow: string) =>
        overflow === "hidden" || overflow === "clip";
      const scrolls = (overflow: string) =>
        overflow === "auto" || overflow === "scroll";
      if ((x && scrolls(style.overflowX)) || (y && scrolls(style.overflowY)))
        break;
      if ((x && clips(style.overflowX)) || (y && clips(style.overflowY))) {
        const marked =
          box === layout &&
          (!x || style.textOverflow === "ellipsis") &&
          (!y || style.webkitLineClamp !== "none");
        if (!marked)
          failure = `${taste.quote(text)} is clipped without an ellipsis.`;
        break;
      }
      if (box === layout)
        failure = `${taste.quote(text)} spills out of its box.`;
      if (box === root) break;
    }
    if (failure) failures.push(taste.at(element, failure));
  }

  // Collisions: two texts whose line boxes overlap by more than the slack.
  for (let i = 0; i < texts.length; i++) {
    for (let j = i + 1; j < texts.length; j++) {
      const a = texts[i]!;
      const b = texts[j]!;
      const overlap = a.rects.some((r) =>
        b.rects.some(
          (s) =>
            Math.min(r.right, s.right) - Math.max(r.left, s.left) > slack &&
            Math.min(r.bottom, s.bottom) - Math.max(r.top, s.top) > slack
        )
      );
      if (overlap) {
        failures.push(
          taste.at(
            a.element,
            `${taste.quote(a.text)} collides with ${taste.quote(b.text)}.`
          )
        );
      }
    }
  }
  return failures;
}
