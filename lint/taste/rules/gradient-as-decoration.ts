// `gradient-as-decoration` (lint/taste/RULES.md). Origin: merges five of
// impeccable's rules, `gradient-text`
// (https://github.com/pbakaus/impeccable/blob/dad8dbb3aac21ad1fa236c110315ef4abece23e8/crates/foundation/src/registry.rs#L74),
// `radial-halo`
// (https://github.com/pbakaus/impeccable/blob/dad8dbb3aac21ad1fa236c110315ef4abece23e8/crates/foundation/src/registry.rs#L194),
// `radial-spotlight-glow`
// (https://github.com/pbakaus/impeccable/blob/dad8dbb3aac21ad1fa236c110315ef4abece23e8/crates/foundation/src/registry.rs#L204),
// `repeating-stripes-gradient`
// (https://github.com/pbakaus/impeccable/blob/dad8dbb3aac21ad1fa236c110315ef4abece23e8/crates/foundation/src/registry.rs#L614)
// and `codex-grid-background`
// (https://github.com/pbakaus/impeccable/blob/dad8dbb3aac21ad1fa236c110315ef4abece23e8/crates/foundation/src/registry.rs#L624),
// Apache 2.0, read at commit dad8dbb; reimplemented, no code copied.
// Impeccable tells each kind of decorative gradient apart. The design brief
// bans gradient washes outright, so this rule doesn't: any gradient in
// source fails, as a Tailwind class, as an arbitrary value or as CSS.

import type { Rule } from "eslint";
import { classTokens } from "../classes.ts";
import { help } from "../rules-md.ts";
import { reporter, sourceVisitors } from "../source.ts";

export const id = "gradient-as-decoration";

// Tailwind 4's gradient backgrounds (and Tailwind 3's `bg-gradient-to-*`),
// their colour stops, and the clip that paints a gradient into type.
const gradientClass =
  /^(?:bg-(?:linear|radial|conic|gradient)(?:-|$)|(?:from|via|to)-|bg-clip-text$)/;

// A gradient function, as CSS or inside an arbitrary value:
// `linear-gradient(`, `repeating-radial-gradient(`, `-webkit-…`.
const gradientFunction = /-gradient\(/i;

// `background-clip: text` as an arbitrary property.
const textClipClass = /^\[(?:-webkit-)?background-clip:text\]$/;

export const lint: Rule.RuleModule = {
  meta: {
    type: "problem",
    docs: { description: help(id), url: "lint/taste/RULES.md" },
    schema: [],
    messages: { gradient: `\`{{finding}}\` is a gradient. ${help(id)}` },
  },
  create(context) {
    const report = reporter(context, "gradient");

    return sourceVisitors(context, {
      classList(text, node) {
        for (const { raw, utility } of classTokens(text)) {
          if (
            gradientClass.test(utility) ||
            gradientFunction.test(utility) ||
            textClipClass.test(utility)
          ) {
            report(node, raw);
          }
        }
      },
      declaration(property, value, node) {
        const textClip =
          /^(?:-webkit-)?background-clip$/.test(property) &&
          value.trim().toLowerCase() === "text";
        if (textClip || gradientFunction.test(value)) {
          report(node, `${property}: ${value}`);
        }
      },
    });
  },
};
