// `type-on-scale` (lint/taste/RULES.md). Origin: adapts impeccable's
// `tiny-text`
// (https://github.com/pbakaus/impeccable/blob/dad8dbb3aac21ad1fa236c110315ef4abece23e8/crates/foundation/src/registry.rs#L494)
// and `undersized-ui-text`
// (https://github.com/pbakaus/impeccable/blob/dad8dbb3aac21ad1fa236c110315ef4abece23e8/crates/foundation/src/registry.rs#L504),
// Apache 2.0, read at commit dad8dbb; reimplemented, no code copied.
// Impeccable sets a floor under text size. The design brief fixes the whole
// scale, so every visible text's computed size and weight must sit on it;
// like impeccable, it is the rendered value that counts, so browser defaults
// (a bold `<th>`, a shrunken `<small>`) fail too.

import type { RenderRule } from "../../../gates/render-rules.ts";
import { inPage } from "../render.ts";
import { help } from "../rules-md.ts";

export const id = "type-on-scale";

// The design brief's type: "Scale on a 14px base … 12, 14, 16, 20, 24, 32",
// "weights 400 and 600 only".
const scale = { sizes: [12, 14, 16, 20, 24, 32], weights: [400, 600] };

export const render: RenderRule = {
  name: id,
  help: help(id),
  check: (page, root) => inPage(page, root, offScale, scale),
};

function offScale(root: Element, { sizes, weights }: typeof scale): string[] {
  const failures: string[] = [];
  const seen = new Set<Element>();
  for (const { element, text } of taste.texts(root)) {
    if (seen.has(element)) continue;
    seen.add(element);
    const style = getComputedStyle(element);
    const size = Math.round(parseFloat(style.fontSize) * 100) / 100;
    const weight = Number(style.fontWeight);
    if (!sizes.includes(size)) {
      failures.push(`${taste.quote(text)} is set at ${size}px.`);
    }
    if (!weights.includes(weight)) {
      failures.push(`${taste.quote(text)} is set in weight ${weight}.`);
    }
  }
  return failures;
}
