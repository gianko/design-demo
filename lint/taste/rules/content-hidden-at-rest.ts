// `content-hidden-at-rest` (lint/taste/RULES.md). Origin: impeccable's
// `content-hidden-at-rest`
// (https://github.com/pbakaus/impeccable/blob/dad8dbb3aac21ad1fa236c110315ef4abece23e8/crates/foundation/src/registry.rs#L344),
// kept; Apache 2.0, read at commit dad8dbb; reimplemented, no code copied.
// Once every animation that ends has ended, each text in the story must be
// seen: no box around it holds it at opacity 0, its visibility isn't hidden,
// and no clip around it leaves no area. Idle loops never end, so the rule
// doesn't wait on them. Text marked `aria-hidden` is decoration, text that
// isn't rendered at all (`display: none`, `hidden`) is out of the layout, and
// text inside a visually hidden box (Screen's status region) is copy only
// assistive tech reads, so none of those count. Waiting changes nothing on
// the page, so the baseline shot after it sees the story as it was.

import { inPage, type RenderFinding, type RenderRule } from "../render.ts";
import { help } from "../rules-md.ts";

export const id = "content-hidden-at-rest";

export const render: RenderRule = {
  name: id,
  help: help(id),
  check: async (page, root) => {
    await page.evaluate(settle);
    return inPage(page, root, hiddenAtRest);
  },
};

// Waits until no animation or transition that has an end is still running,
// including any a finished one starts.
async function settle() {
  for (let round = 0; round < 10; round++) {
    const ending = document
      .getAnimations()
      .filter(
        (animation) =>
          animation.playState === "running" &&
          animation.effect?.getComputedTiming().endTime !== Infinity
      );
    if (ending.length === 0) return;
    await Promise.all(
      ending.map((animation) => animation.finished.catch(() => undefined))
    );
  }
}

function hiddenAtRest(root: Element): RenderFinding[] {
  const failures: RenderFinding[] = [];
  const reported = new Set<Element>();
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const text = node.textContent!.replace(/\s+/g, " ").trim();
    const element = node.parentElement;
    if (!text || !element) continue;
    if (element.closest('[aria-hidden="true"]')) continue;
    if (!element.checkVisibility()) continue;
    const boxes: Element[] = [];
    for (let box: Element | null = element; box; box = box.parentElement) {
      boxes.push(box);
      if (box === root) break;
    }
    if (boxes.some(visuallyHidden)) continue;

    const hiding =
      boxes
        .filter((box) => parseFloat(getComputedStyle(box).opacity) === 0)
        .map((box) => [box, "stays at opacity 0"] as const)
        .at(-1) ??
      (["hidden", "collapse"].includes(getComputedStyle(element).visibility)
        ? ([element, "stays at visibility: hidden"] as const)
        : undefined) ??
      boxes
        .filter(clipsToNothing)
        .map((box) => [box, "stays clipped to nothing"] as const)
        .at(-1);
    if (!hiding) continue;
    const [box, finding] = hiding;
    if (reported.has(box)) continue;
    reported.add(box);
    failures.push(taste.at(box, `${taste.quote(text)} ${finding}.`));
  }
  return failures;

  // The visually hidden pattern, as Tailwind's `sr-only` and Screen's status
  // region draw it: a box of at most 1px that hides its overflow. Its clip is
  // part of the pattern, so a zero-size clip on a box of any other size
  // still counts.
  function visuallyHidden(box: Element) {
    const style = getComputedStyle(box);
    const { width, height } = box.getBoundingClientRect();
    return (
      width <= 1 &&
      height <= 1 &&
      clips(style.overflowX) &&
      clips(style.overflowY)
    );
  }

  function clips(overflow: string) {
    return overflow === "hidden" || overflow === "clip";
  }

  // A clip that leaves no area: a `clip-path` inset that meets itself or a
  // circle or ellipse of no radius, a `clip` rect with no area, or a box with
  // no width or no height that hides its overflow on that axis.
  function clipsToNothing(box: Element) {
    const style = getComputedStyle(box);
    // A `display: contents` box has no box to clip with.
    if (style.display === "contents") return false;
    // Untransformed, where there's a layout box to read.
    const { width, height } =
      box instanceof HTMLElement
        ? { width: box.offsetWidth, height: box.offsetHeight }
        : box.getBoundingClientRect();
    if (width === 0 && clips(style.overflowX)) return true;
    if (height === 0 && clips(style.overflowY)) return true;

    const clipPath = style.clipPath;
    const inset = /^inset\(([^)]*?)(?: round [^)]*)?\)$/.exec(clipPath);
    if (inset) {
      const lengths = inset[1]!.trim().split(/\s+/);
      const [top, right = top, bottom = top, left = right] = lengths;
      const px = (length: string | undefined, of: number) => {
        if (!length) return NaN;
        if (length.endsWith("%")) return (parseFloat(length) / 100) * of;
        if (length.endsWith("px") || length === "0") return parseFloat(length);
        return NaN;
      };
      const across = width - px(left, width) - px(right, width);
      const down = height - px(top, height) - px(bottom, height);
      if (across <= 0 || down <= 0) return true;
    }
    if (/^(circle|ellipse)\((0(px|%)?)[\s)]/.test(clipPath)) return true;
    if (/^ellipse\(\S+ 0(px|%)?[\s)]/.test(clipPath)) return true;

    const rect =
      /^rect\(([-\d.]+)px,? ([-\d.]+)px,? ([-\d.]+)px,? ([-\d.]+)px\)$/.exec(
        style.clip
      );
    if (rect) {
      const [top, right, bottom, left] = rect.slice(1).map(Number) as [
        number,
        number,
        number,
        number,
      ];
      if (right <= left || bottom <= top) return true;
    }
    return false;
  }
}
