// token/no-raw-css-values: the CSS layer of token lint (ADR 0002). A value in
// a `.css` file must come from a `--ds-*` token, so any colour, length,
// duration, easing, font or design number written out is a finding, wherever
// it sits: in a property, a custom property or a var() fallback. `@apply` is
// held to the same class patterns as TSX. The config leaves out `tokens/`, the
// one place raw values belong.

import type { CSSRuleDefinition } from "@eslint/css";
import { colorsNamed } from "culori";
import { restrictedClasses } from "./restricted-classes.ts";

const colourFunctions =
  "rgba?|hsla?|hwb|lab|lch|oklab|oklch|color|color-mix|light-dark";
const easingFunctions = "cubic-bezier|steps|linear";
const easingKeywords =
  "ease|ease-in|ease-out|ease-in-out|linear|step-start|step-end";
const namedColours = Object.keys(colorsNamed).join("|");
const word = (alternatives: string) => new RegExp(`^(?:${alternatives})$`, "i");

// Bare numbers are design values in these properties, not counts or factors.
const numbered = word("z-index|opacity|font-weight|line-height");
const fonts = word("font|font-family");
const motion = /^(?:transition|animation)/i;
const cssWideKeywords = word("inherit|initial|unset|revert|revert-layer");

// Text CSSTree leaves unparsed: custom properties and var() fallbacks.
const rawInText = new RegExp(
  [
    String.raw`#[0-9a-f]{3,8}\b`,
    String.raw`\b(?:${colourFunctions}|${easingFunctions})\([^)]*\)`,
    String.raw`(?<![\w.-])(?:\d*\.)?\d*[1-9]\d*(?:px|r?em|ex|ch|vh|vw|ms|s|deg|turn)\b`,
    String.raw`(?<![\w-])(?:${namedColours})(?![\w-])`,
  ].join("|"),
  "gi"
);

export const noRawCssValues: CSSRuleDefinition = {
  meta: {
    type: "problem",
    docs: { description: "Disallow values that don't come from a token." },
    messages: {
      raw: "Raw value '{{value}}' in '{{property}}'. Use a token: var(--ds-…).",
      apply: "{{message}} (in @apply)",
    },
  },
  create(context) {
    const { sourceCode } = context;
    const text = sourceCode.text;
    // The declaration being walked; values outside one aren't checked.
    let property: string | null = null;

    // ESLint locations from an offset into the file.
    const locAt = (index: number) => {
      const before = text.slice(0, index);
      const line = before.split("\n").length;
      return { line, column: index - before.lastIndexOf("\n") };
    };
    const reportAt = (
      index: number,
      length: number,
      messageId: "raw" | "apply",
      data: Record<string, string>
    ) =>
      context.report({
        loc: { start: locAt(index), end: locAt(index + length) },
        messageId,
        data,
      });
    const report = (node: Parameters<typeof sourceCode.getRange>[0]) => {
      const [start, end] = sourceCode.getRange(node);
      reportAt(start, end - start, "raw", {
        value: text.slice(start, end),
        property: property!,
      });
    };

    return {
      Declaration(node) {
        property = node.property;
      },
      "Declaration:exit"() {
        property = null;
      },
      Raw(node) {
        if (!property) return;
        const [start] = sourceCode.getRange(node);
        for (const match of node.value.matchAll(rawInText)) {
          reportAt(start + match.index, match[0].length, "raw", {
            value: match[0],
            property,
          });
        }
      },
      Hash(node) {
        if (property) report(node);
      },
      Dimension(node) {
        if (property && Number(node.value) !== 0 && node.unit !== "fr") {
          report(node);
        }
      },
      Number(node) {
        if (property && numbered.test(property) && Number(node.value) !== 0) {
          report(node);
        }
      },
      Function(node) {
        if (!property) return;
        if (
          word(colourFunctions).test(node.name) ||
          (word(easingFunctions).test(node.name) && motion.test(property))
        ) {
          report(node);
        }
      },
      Identifier(node) {
        if (!property || node.name.startsWith("--")) return;
        if (cssWideKeywords.test(node.name)) return;
        if (
          word(namedColours).test(node.name) ||
          (word(easingKeywords).test(node.name) && motion.test(property)) ||
          fonts.test(property)
        ) {
          report(node);
        }
      },
      String(node) {
        if (property && fonts.test(property)) report(node);
      },
      "Atrule[name='apply']"(node) {
        if (!node.prelude) return;
        const [start, end] = sourceCode.getRange(node.prelude);
        for (const match of text.slice(start, end).matchAll(/\S+/g)) {
          const className = match[0];
          const restriction = restrictedClasses.find(({ pattern }) =>
            new RegExp(pattern).test(className)
          );
          if (!restriction) continue;
          const groups = className.match(restriction.pattern)!;
          reportAt(start + match.index, className.length, "apply", {
            message: restriction.message.replace(
              /\$(\d)/g,
              (_, i: string) => groups[Number(i)] ?? ""
            ),
          });
        }
      },
    };
  },
};
