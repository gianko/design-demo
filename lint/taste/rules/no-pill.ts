// `no-pill` (lint/taste/RULES.md). Origin: the design brief, "Nothing is fully
// rounded except avatars." Static: `rounded-full` in source outside the
// exempt components, and its CSS equivalents. Render: any element whose
// computed radius reaches half its shorter side, however it got there (a
// token radius on a short element is as much a pill as `rounded-full`).

import type { Rule } from "eslint";
import { classTokens } from "../classes.ts";
import { config } from "../config.ts";
import { inPage, type RenderRule } from "../render.ts";
import { help } from "../rules-md.ts";
import { reporter, sourceVisitors } from "../source.ts";

export const id = "no-pill";

type Options = { exempt: readonly string[] };

const fullyRounded =
  /^-?rounded(?:-(?:t|r|b|l|s|e|tl|tr|br|bl|ss|se|es|ee))?-full$/;

// A declared radius that rounds anything fully: Tailwind's `rounded-full`
// value, a length no box reaches, or half the box or more.
const fullRadius =
  /infinity|\b\d{4,}(?:\.\d+)?px\b|\b(?:[5-9]\d|\d{3,})(?:\.\d+)?%/;

export const lint: Rule.RuleModule = {
  meta: {
    type: "problem",
    docs: { description: help(id), url: "lint/taste/RULES.md" },
    schema: [
      {
        type: "object",
        properties: { exempt: { type: "array", items: { type: "string" } } },
        additionalProperties: false,
      },
    ],
    messages: { pill: `\`{{finding}}\` is fully rounded. ${help(id)}` },
  },
  create(context) {
    const { exempt = [] } = (context.options[0] ?? {}) as Partial<Options>;
    const path = context.filename.split("\\").join("/");
    if (exempt.some((name) => path.includes(`/components/${name}/`))) return {};

    const report = reporter(context, "pill");

    return sourceVisitors(context, {
      classList(text, node) {
        for (const token of classTokens(text)) {
          if (fullyRounded.test(token.utility)) report(node, token.raw);
        }
      },
      declaration(property, value, node) {
        if (
          /^border(?:-[a-z]+)*-radius$/.test(property) &&
          fullRadius.test(value)
        ) {
          report(node, `${property}: ${value}`);
        }
      },
    });
  },
};

export const render: RenderRule = {
  name: id,
  help: help(id),
  check: (page, root) => inPage(page, root, findPills, config[id].exempt),
};

// In the page: every visible box whose corner radius reaches half its height
// (or half its width, for a box taller than wide), outside the exempt
// components.
function findPills(root: Element, exempt: readonly string[]): string[] {
  const failures: string[] = [];
  const corners = [
    "borderTopLeftRadius",
    "borderTopRightRadius",
    "borderBottomRightRadius",
    "borderBottomLeftRadius",
  ] as const;
  for (const element of root.querySelectorAll("*")) {
    if (exempt.some((name) => element.closest(`[data-component="${name}"]`))) {
      continue;
    }
    const { width, height } = element.getBoundingClientRect();
    if (width === 0 || height === 0 || !element.checkVisibility()) continue;
    const style = getComputedStyle(element);
    // A computed corner is "12px", "50%" or "12px 6px" (horizontal,
    // vertical); each radius is measured against the half side it runs along.
    const px = (value: string, side: number) =>
      value.endsWith("%")
        ? (parseFloat(value) / 100) * side
        : parseFloat(value);
    const share = Math.max(
      ...corners.map((corner) => {
        const [x = "0", y = x] = style[corner].split(" ");
        return Math.max(
          px(x, width) / (width / 2),
          px(y, height) / (height / 2)
        );
      })
    );
    if (share < 1) continue;
    const text = element.textContent!.replace(/\s+/g, " ").trim();
    const radius = Math.max(
      ...corners.map((corner) => px(style[corner].split(" ")[0]!, width))
    );
    failures.push(
      `${text ? taste.quote(text) : `<${element.tagName.toLowerCase()}>`} has a ${Math.round(radius)}px corner radius on a ${Math.round(Math.min(width, height))}px-high box.`
    );
  }
  return failures;
}
