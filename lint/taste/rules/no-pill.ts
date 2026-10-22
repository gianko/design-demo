// `no-pill` (lint/taste/RULES.md). Origin: the design brief, "Nothing is fully
// rounded except avatars." Static: `rounded-full` in source outside the
// exempt components, and its CSS equivalents. Render: any element whose
// computed radius reaches half its shorter side, however it got there (a
// token radius on a short element is as much a pill as `rounded-full`).

import type { Rule } from "eslint";
import { classTokens } from "../classes.ts";
import { help } from "../rules-md.ts";
import { sourceVisitors } from "../source.ts";

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
    messages: { pill: `\`{{found}}\` is fully rounded. ${help(id)}` },
  },
  create(context) {
    const { exempt = [] } = (context.options[0] ?? {}) as Partial<Options>;
    const path = context.filename.split("\\").join("/");
    if (exempt.some((name) => path.includes(`/components/${name}/`))) return {};

    const report = (node: unknown, found: string) =>
      context.report({
        node: node as Rule.Node,
        messageId: "pill",
        data: { found },
      });

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
