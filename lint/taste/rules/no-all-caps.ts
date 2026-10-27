// `no-all-caps` (lint/taste/RULES.md). Origin: the design brief, "Sentence
// case everywhere. No ALL-CAPS labels or table headers." It adapts
// impeccable's `all-caps-body`
// (https://github.com/pbakaus/impeccable/blob/dad8dbb3aac21ad1fa236c110315ef4abece23e8/crates/foundation/src/registry.rs#L514),
// Apache 2.0, read at commit dad8dbb; reimplemented, no code copied.
// Impeccable flags 80 characters of uppercase; the brief bans capitals
// outright, so any length counts. Static: `uppercase` in source, as a class
// or as the CSS it compiles to. Render: text the browser sets in capitals,
// however it got there, and copy written in capitals, word by word, past the
// allowlist in the rule's config.

import type { Rule } from "eslint";
import { classTokens } from "../classes.ts";
import { config } from "../config.ts";
import { inPage, type RenderFinding, type RenderRule } from "../render.ts";
import { help } from "../rules-md.ts";
import { reporter, sourceVisitors } from "../source.ts";

export const id = "no-all-caps";

// `uppercase`, or the same CSS as an arbitrary property.
const uppercaseClass = /^(?:uppercase|\[text-transform:uppercase\])$/;

export const lint: Rule.RuleModule = {
  meta: {
    type: "problem",
    docs: { description: help(id), url: "lint/taste/RULES.md" },
    // The config's allowlist is the render half's: a class has no words.
    schema: [
      {
        type: "object",
        properties: { allow: { type: "array", items: { type: "string" } } },
        additionalProperties: false,
      },
    ],
    messages: { caps: `\`{{finding}}\` sets text in capitals. ${help(id)}` },
  },
  create(context) {
    const report = reporter(context, "caps");

    return sourceVisitors(context, {
      classList(text, node) {
        for (const token of classTokens(text)) {
          if (uppercaseClass.test(token.utility)) report(node, token.raw);
        }
      },
      declaration(property, value, node) {
        if (property === "text-transform" && /\buppercase\b/i.test(value)) {
          report(node, `${property}: ${value}`);
        }
      },
    });
  },
};

export const render: RenderRule = {
  name: id,
  help: help(id),
  check: (page, root) => inPage(page, root, findCaps, config[id].allow),
};

// In the page: visible text the browser sets in capitals, once per element,
// and each word of 3+ letters typed in capitals that the allowlist doesn't
// name. A word is a run of letters in a whitespace-separated token with no
// digits in it: a token with digits (`INV-0142`, an IBAN) is a code, not
// copy set in caps.
function findCaps(root: Element, allow: readonly string[]): RenderFinding[] {
  const failures: RenderFinding[] = [];
  const transformed = new Set<Element>();
  for (const { element, text } of taste.texts(root)) {
    if (
      getComputedStyle(element).textTransform === "uppercase" &&
      !transformed.has(element)
    ) {
      transformed.add(element);
      failures.push(
        taste.at(element, `${taste.quote(text)} is set in uppercase.`)
      );
    }
    for (const token of text.split(" ")) {
      if (/\d/.test(token)) continue;
      for (const [word] of token.matchAll(/\p{L}+/gu)) {
        if (
          word.length >= 3 &&
          word === word.toUpperCase() &&
          word !== word.toLowerCase() &&
          !allow.includes(word)
        ) {
          failures.push(
            taste.at(element, `${taste.quote(word)} is in all caps.`)
          );
        }
      }
    }
  }
  return failures;
}
