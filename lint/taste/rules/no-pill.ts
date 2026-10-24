// `no-pill` (lint/taste/RULES.md). Origin: the design brief, "Nothing is fully
// rounded except avatars." Static: `rounded-full` in source outside the
// exempt components, as a class or as the value it compiles to. Render: any
// element whose computed radius reaches half its height, however it got
// there (a token radius on a short element is as much a pill as
// `rounded-full`).

import type { Rule } from "eslint";
import { relative, sep } from "node:path";
import { classTokens } from "../classes.ts";
import { config } from "../config.ts";
import { inPage, type RenderFinding, type RenderRule } from "../render.ts";
import { help } from "../rules-md.ts";
import { reporter, sourceVisitors } from "../source.ts";

export const id = "no-pill";

type Options = { exempt: readonly string[] };

const fullyRounded =
  /^-?rounded(?:-(?:t|r|b|l|s|e|tl|tr|br|bl|ss|se|es|ee))?-full$/;

// `rounded-full` written as CSS: the value Tailwind 4 compiles it to,
// `calc(infinity * 1px)`, or Tailwind 3's `9999px`.
const fullRadius = /\binfinity\b|(?<![\d.])9999px\b/;

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
    // A library component's files live in `src/components/<Name>/` (docs/spec.md
    // § Component pieces).
    const path = relative(context.cwd, context.filename).split(sep).join("/");
    if (exempt.some((name) => path.startsWith(`src/components/${name}/`))) {
      return {};
    }

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

// In the page: every visible box whose corner radius reaches half its
// height, outside the exempt components.
function findPills(root: Element, exempt: readonly string[]): RenderFinding[] {
  const failures: RenderFinding[] = [];
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
    // vertical). Its vertical radius is the one that runs along the height.
    const radius = Math.max(
      ...corners.map((corner) => {
        const [x = "0", y = x] = style[corner].split(" ");
        return y.endsWith("%") ? (parseFloat(y) / 100) * height : parseFloat(y);
      })
    );
    if (radius < height / 2) continue;
    const text = element.textContent!.replace(/\s+/g, " ").trim();
    failures.push(
      taste.at(
        element,
        `${text ? taste.quote(text) : `<${element.tagName.toLowerCase()}>`} has a ${Math.round(radius)}px corner radius on a ${Math.round(height)}px-high box.`
      )
    );
  }
  return failures;
}
