// `edge-treatment` (lint/taste/RULES.md). Origin: impeccable's
// `gpt-thin-border-wide-shadow`
// (https://github.com/pbakaus/impeccable/blob/dad8dbb3aac21ad1fa236c110315ef4abece23e8/crates/foundation/src/registry.rs#L604)
// and `side-tab`
// (https://github.com/pbakaus/impeccable/blob/dad8dbb3aac21ad1fa236c110315ef4abece23e8/crates/foundation/src/registry.rs#L34),
// Apache 2.0, read at commit dad8dbb; reimplemented, no code copied.
// Impeccable flags a hairline border under a wide shadow, and a thick
// coloured stripe down one side of a card. The brief makes the first a rule
// of elevation: a flat surface is edged by a `line` hairline and a floating
// one by its shadow, so one slot never carries both, and a shadow never draws
// an edge. The second becomes: a one-sided border is never wider than the
// hairline.

import type { Rule } from "eslint";
import { shadow as shadowTokens } from "../../../tokens/tokens.ts";
import { classTokens, type ClassToken } from "../classes.ts";
import { help } from "../rules-md.ts";
import { reporter, sourceVisitors, type Render } from "../source.ts";
import { splitOutsideBrackets } from "../split.ts";

export const id = "edge-treatment";

// A border width: `border`, a side's `border-t`, or either with a width.
// `border-line` (a colour), `border-collapse` and `border-0` aren't one.
const borderWidth =
  /^border(?:-(?:x|y|t|r|b|l|s|e|bs|be))?(?:-(\d+(?:\.\d+)?|px|\[(?:length:)?[\d.][^\]]*\]|\(length:[^)]+\)))?$/;
// An elevation shadow: the theme's `shadow-*` tokens, or a raw one.
const shadow = new RegExp(
  `^shadow(?:-(?:${shadowTokens.join("|")})|-\\[[^\\]]+\\]|-\\([^)]+\\))?$`
);

// A ring: a shadow drawn as an edge. `ring-focus` (a colour) and `ring-0`
// draw nothing.
const ring =
  /^(?:inset-)?ring(?:-(\d+(?:\.\d+)?|px|\[(?:length:)?[\d.][^\]]*\]|\(length:[^)]+\)))?$/;

const isRing = (token: ClassToken) => {
  const match = ring.exec(token.utility);
  return match !== null && !/^0(?:\.0*)?$/.test(match[1] ?? "");
};
const isBorder = (token: ClassToken) => {
  const match = borderWidth.exec(token.utility);
  return match !== null && !/^0(?:\.0*)?$/.test(match[1] ?? "");
};
const isShadow = (token: ClassToken) => shadow.test(token.utility);

// One side's border, and its width class as written (`4`, `px`, `[3px]`).
const sideBorder =
  /^border-(?:t|r|b|l|s|e|bs|be)-(\d+(?:\.\d+)?|px|\[(?:length:)?([^\]]+)\])$/;

// The hairline is 1px, `border`'s own width.
const hairline = 1;

// A one-sided border class's width in px; null when it isn't one or its
// width can't be read.
function sideWidth(token: ClassToken): number | null {
  const match = sideBorder.exec(token.utility);
  if (!match) return null;
  const [, width, arbitrary] = match;
  if (width === "px") return 1;
  if (arbitrary !== undefined) return lengthPx(arbitrary);
  return Number(width);
}

// A CSS length in px: px, rem or em (at 16px), or a `border-width` keyword.
function lengthPx(length: string): number | null {
  const keyword = { thin: 1, medium: 3, thick: 5 }[length];
  if (keyword !== undefined) return keyword;
  const match = /^(\d*\.?\d+)(px|r?em)?$/.exec(length);
  if (!match) return null;
  const [, number, unit] = match;
  if (!unit && Number(number) !== 0) return null;
  return Number(number) * (unit === "px" || !unit ? 1 : 16);
}

export const lint: Rule.RuleModule = {
  meta: {
    type: "problem",
    docs: { description: help(id), url: "lint/taste/RULES.md" },
    schema: [],
    messages: { edge: `{{finding}} ${help(id)}` },
  },
  create(context) {
    const report = reporter(context, "edge");
    const tokenFindings = (text: string, node: unknown) => {
      for (const token of classTokens(text)) {
        if (isRing(token)) {
          report(node, `\`${token.raw}\` draws an edge with a shadow.`);
        }
        const width = sideWidth(token);
        if (width !== null && width > hairline) {
          report(node, `\`${token.raw}\` is a ${width}px border on one side.`);
        }
      }
    };

    if ((context.sourceCode.ast as { type: string }).type === "StyleSheet") {
      const css = cssVisitors(report);
      return sourceVisitors(context, {
        classList(text, node, selector) {
          tokenFindings(text, node);
          css.classList(text, node, selector);
        },
        declaration: css.declaration,
      });
    }
    return sourceVisitors(context, {
      classList: tokenFindings,
      classLists(renders) {
        for (const { node, finding } of borderAndShadow(renders)) {
          report(node, finding);
        }
      },
    });
  },
};

// A border and a shadow among the classes one slot gets together, reported
// once on the class list that adds the shadow. When only some of a tv()
// call's option sets put the two together, the finding names one.
function borderAndShadow(
  renders: Render[]
): { node: unknown; finding: string }[] {
  const both = new Map<unknown, { finding: string; options: string }>();
  const apart = new Set<unknown>();
  for (const { lists, options } of renders) {
    const tokens = lists.flatMap(({ text, node }) =>
      classTokens(text).map((token) => ({ ...token, node }))
    );
    const shadowToken = tokens.find(isShadow);
    if (!shadowToken) continue;
    const pair = carried(tokens);
    if (!pair) {
      apart.add(shadowToken.node);
      continue;
    }
    if (!both.has(shadowToken.node)) {
      both.set(shadowToken.node, { finding: pairFinding(pair), options });
    }
  }
  return [...both].map(([node, { finding, options }]) => ({
    node,
    finding:
      apart.has(node) && options ? `${finding} (${options}).` : `${finding}.`,
  }));
}

type Located = ClassToken & { node: unknown };

// The border and the shadow one element carries together, if it does. A
// border zeroed under the shadow's own variants (`data-[floating]:border-0`)
// is traded for the shadow, not carried with it.
function carried(
  tokens: Located[]
): { border: Located; shadow: Located } | null {
  const shadowToken = tokens.find(isShadow);
  if (!shadowToken) return null;
  const variants = shadowToken.variants.join(":");
  const traded = tokens.some(
    (t) =>
      /^border(?:-[a-z]+)?-0$/.test(t.utility) &&
      t.variants.join(":") === variants
  );
  const borderToken = traded ? undefined : tokens.find(isBorder);
  return borderToken ? { border: borderToken, shadow: shadowToken } : null;
}

function pairFinding({ border, shadow }: { border: Located; shadow: Located }) {
  return `\`${border.raw}\` and \`${shadow.raw}\` land on one slot`;
}

// CSS: a selector's @apply classes and declarations all land on the elements
// it matches, so they are pooled per selector, each declaration standing in
// as the class it amounts to (`border`, `shadow`).
function cssVisitors(report: (node: unknown, finding: string) => void) {
  const pooled = new Map<string, { tokens: Located[]; reported: boolean }>();
  const pool = (selector: string, tokens: Located[], node: unknown) => {
    const entry = pooled.get(selector) ?? { tokens: [], reported: false };
    pooled.set(selector, entry);
    entry.tokens.push(...tokens);
    const pair = entry.reported ? null : carried(entry.tokens);
    if (pair) {
      entry.reported = true;
      report(node, `${pairFinding(pair)}.`);
    }
  };
  const as = (utility: string, raw: string, node: unknown): Located => ({
    raw,
    utility,
    variants: [],
    node,
  });

  return {
    classList(text: string, node: unknown, selector: string) {
      pool(
        selector,
        classTokens(text).map((token) => ({ ...token, node })),
        node
      );
    },
    declaration(
      property: string,
      written: string,
      node: unknown,
      selector: string
    ) {
      const value = written.replace(/\s+/g, " ").trim();
      const raw = `${property}: ${value}`;
      if (property === "box-shadow") {
        const kind = shadowKind(value);
        if (kind === "edge")
          report(node, `\`${raw}\` draws an edge with a shadow.`);
        if (kind === "shadow") pool(selector, [as("shadow", raw, node)], node);
        return;
      }
      const widths = borderWidths(property, value);
      if (!widths) return;
      const side = oneSided.test(property);
      const known = widths.filter((w): w is number => w !== null);
      const widest = Math.max(0, ...known);
      if (widest > hairline && (side || new Set(known).size > 1)) {
        report(node, `\`${raw}\` is a ${widest}px border on one side.`);
      }
      if (widths.some((w) => w === null || w > 0)) {
        pool(selector, [as("border", raw, node)], node);
      }
    },
  };
}

// The properties that set a border's width, and those that set one side's.
const borderProperty =
  /^border(?:-(?:top|right|bottom|left|block|inline)(?:-(?:start|end))?)?(?:-width)?$/;
const oneSided =
  /^border-(?:top|right|bottom|left|(?:block|inline)-(?:start|end))(?:-width)?$/;

// The widths a border declaration sets, in px (null where a var() or calc()
// hides one), or null when it isn't a border width at all. A shorthand that
// names no width sets `medium`; one whose style is `none` sets no border.
function borderWidths(
  property: string,
  value: string
): (number | null)[] | null {
  if (!borderProperty.test(property)) return null;
  const parts = splitOutsideBrackets(value.trim(), " ").filter(Boolean);
  if (property.endsWith("-width")) return parts.map(lengthPx);
  if (parts.some((part) => /^(?:none|hidden)$/.test(part))) return [0];
  const width = parts.map(lengthPx).find((px) => px !== null);
  if (width !== undefined) return [width];
  return parts.length === 1 && parts[0]!.startsWith("var(") ? [null] : [3];
}

// A box-shadow is an edge when every layer is hard (no blur), a shadow when
// any layer is soft or hidden in a var(), and nothing when it's `none`.
function shadowKind(value: string): "edge" | "shadow" | null {
  if (value.trim() === "none") return null;
  const hard = splitOutsideBrackets(value, ",").every((layer) => {
    const lengths = splitOutsideBrackets(layer.trim(), " ").filter((part) =>
      /^-?\d*\.?\d+(?:px|r?em)?$/.test(part)
    );
    return lengths.length >= 2 && parseFloat(lengths[2] ?? "0") === 0;
  });
  return hard ? "edge" : "shadow";
}
