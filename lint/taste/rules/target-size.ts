// `target-size` (lint/taste/RULES.md). Origin: the design brief, "Minimum
// target: 24px admin, 44px contractor." The admin floor is WCAG 2.2 AA's,
// which gate 4's axe already holds, so this holds the contractor one: in a
// `data-density="contractor"` scope, every interactive element's hit area is
// at least 44×44px. A control's `<label>` takes its clicks too, so the hit
// area is whichever of the two boxes is larger. A link inside a sentence
// takes the sentence's line height, and WCAG exempts it, so this does too.

import { inPage, type RenderFinding, type RenderRule } from "../render.ts";
import { help } from "../rules-md.ts";

export const id = "target-size";

// The contractor density's `min-height-target` token, in px.
const minimum = 44;

export const render: RenderRule = {
  name: id,
  help: help(id),
  check: (page, root) => inPage(page, root, smallTargets, minimum),
};

// In the page: every visible interactive element in a contractor scope whose
// own box and labels' boxes are all under the minimum on either side.
function smallTargets(root: Element, minimum: number): RenderFinding[] {
  const interactive = [
    "a[href]",
    "button",
    "input:not([type=hidden])",
    "select",
    "textarea",
    "summary",
    "[tabindex]:not([tabindex='-1'])",
    ...[
      "button",
      "link",
      "checkbox",
      "radio",
      "switch",
      "tab",
      "menuitem",
      "menuitemcheckbox",
      "menuitemradio",
      "option",
      "slider",
      "combobox",
    ].map((role) => `[role=${role}]`),
  ].join(",");
  const failures: RenderFinding[] = [];
  for (const element of root.querySelectorAll(interactive)) {
    const scope = element.closest("[data-density]");
    if (scope?.getAttribute("data-density") !== "contractor") continue;
    if (!element.checkVisibility({ visibilityProperty: true })) continue;
    if (inSentence(element)) continue;
    const labels =
      "labels" in element && element.labels
        ? [...(element.labels as NodeListOf<HTMLLabelElement>)]
        : [];
    const boxes = [element, ...labels].map((box) =>
      box.getBoundingClientRect()
    );
    // Sub-pixel layout can leave a 44px box a hair short.
    const fits = (rect: DOMRect) =>
      rect.width + 0.01 >= minimum && rect.height + 0.01 >= minimum;
    if (boxes.some(fits)) continue;
    const largest = boxes.reduce((a, b) =>
      b.width * b.height > a.width * a.height ? b : a
    );
    failures.push(
      taste.at(
        element,
        `${name(element, labels)} has a ${Math.round(largest.width)}×${Math.round(largest.height)}px hit area, under ${minimum}×${minimum}px.`
      )
    );
  }
  return failures;

  // A link set inline among other words, so its box is the line's.
  function inSentence(element: Element) {
    if (element.tagName !== "A") return false;
    if (getComputedStyle(element).display !== "inline") return false;
    const words = (node: Node | null) => taste.words(node?.textContent ?? "");
    return words(element.parentElement) !== words(element);
  }

  // What the element reads as: its text, its label's, its `aria-label`, or
  // its tag.
  function name(element: Element, labels: Element[]) {
    const text = [element, ...labels]
      .map((box) => taste.words(box.textContent!))
      .find(Boolean);
    const label = text || element.getAttribute("aria-label");
    return label ? taste.quote(label) : `<${element.tagName.toLowerCase()}>`;
  }
}
