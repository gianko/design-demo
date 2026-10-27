// `no-pure-neutral-text` (lint/taste/RULES.md). Origin: the design brief.
// Every neutral the tokens define is tinted toward plum, so a text colour
// with no chroma at all came from somewhere else: a hand-written black,
// grey or white, or, more often, a default the tokens never reached: the
// browser's black on text with no colour set, or the placeholder grey
// Tailwind's preflight mixes from it. It is the rendered colour that counts,
// so each of those fails wherever it shows.

import { inPage, type RenderFinding, type RenderRule } from "../render.ts";
import { help } from "../rules-md.ts";

export const id = "no-pure-neutral-text";

// Below this OKLCH chroma a colour counts as having none. The faintest tint
// the tokens use is 0.003; converting a grey to OKLCH leaves float noise
// around 0.00005.
const noChroma = 0.001;

export const render: RenderRule = {
  name: id,
  help: help(id),
  check: (page, root) => inPage(page, root, untinted, noChroma),
};

function untinted(root: Element, noChroma: number): RenderFinding[] {
  const failures: RenderFinding[] = [];
  // The browser converts each colour to OKLCH, whatever space it was
  // written in, on an element of its own.
  const probe = document.createElement("span");
  probe.hidden = true;
  document.body.append(probe);
  const chroma = (colour: string) => {
    probe.style.color = `oklch(from ${colour} l c h)`;
    return Number(getComputedStyle(probe).color.split(/[\s()]+/)[2]);
  };
  const check = (element: Element, what: string, colour: string) => {
    if (chroma(colour) < noChroma) {
      failures.push(
        taste.at(element, `${what} is set in ${colour}, which has no chroma.`)
      );
    }
  };

  const seen = new Set<Element>();
  for (const { element, text } of taste.texts(root)) {
    if (seen.has(element)) continue;
    seen.add(element);
    check(element, taste.quote(text), getComputedStyle(element).color);
  }

  // A field's text is no text node, so the walk above never sees it: what it
  // shows is its placeholder while it's empty, and its value after.
  const fields = root.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>(
    "textarea, input:is([type=text], [type=search], [type=email], [type=tel], [type=url], [type=number], [type=password], :not([type]))"
  );
  for (const field of fields) {
    if (!field.checkVisibility({ visibilityProperty: true })) continue;
    if (field.matches(":placeholder-shown")) {
      check(
        field,
        `The placeholder ${taste.quote(field.placeholder)}`,
        getComputedStyle(field, "::placeholder").color
      );
    } else if (field.value) {
      check(field, taste.quote(field.value), getComputedStyle(field).color);
    }
  }

  probe.remove();
  return failures;
}
