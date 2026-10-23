// Taste rules can't be suppressed inline (lint/taste/RULES.md § Exemptions):
// an exemption lives only in lint/taste/config.ts. So an `eslint-disable`
// comment that names a `taste/*` rule is an error, and so is one that names
// no rule, since that silences every rule, taste rules included. Opt-outs of
// other rules, token lint's among them, are left to those rules' owners.
//
// A rule's report can itself be silenced by a directive that names it, so
// one that names this rule too gets past it; that takes a deliberate act.

import type { Rule } from "eslint";

type Directive = {
  type: "disable" | "enable" | "disable-line" | "disable-next-line";
  node: { loc: Rule.Node["loc"] };
  // The rule list, e.g. "taste/no-pill, token/no-raw-css-values".
  value: string;
};

export const noInlineDisable: Rule.RuleModule = {
  meta: {
    type: "problem",
    docs: {
      description: "Disallow inline opt-outs of taste rules.",
      url: "lint/taste/RULES.md",
    },
    schema: [],
    messages: {
      named:
        "`{{rules}}` can't be disabled inline. Taste rules have no inline opt-out; an exemption lives in lint/taste/config.ts, and adding one is a human decision (lint/taste/RULES.md § Exemptions).",
      bare: "An `eslint-disable` that names no rule silences taste rules too. Name the rules it disables; taste rules have no inline opt-out (lint/taste/RULES.md § Exemptions).",
    },
  },
  create(context) {
    const { directives } = (
      context.sourceCode as unknown as {
        getDisableDirectives(): { directives: Directive[] };
      }
    ).getDisableDirectives();
    for (const { type, node, value } of directives) {
      if (type === "enable") continue;
      const names = value
        .split(",")
        .map((name) => name.trim())
        .filter(Boolean);
      const taste = names.filter((name) => name.startsWith("taste/"));
      if (names.length === 0) {
        context.report({ loc: node.loc!, messageId: "bare" });
      } else if (taste.length > 0) {
        context.report({
          loc: node.loc!,
          messageId: "named",
          data: { rules: taste.join(", ") },
        });
      }
    }
    return {};
  },
};
