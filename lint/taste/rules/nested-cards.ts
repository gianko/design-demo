// `nested-cards` (lint/taste/RULES.md). Origin: impeccable's `nested-cards`
// (https://github.com/pbakaus/impeccable/blob/dad8dbb3aac21ad1fa236c110315ef4abece23e8/crates/foundation/src/registry.rs#L104),
// Apache 2.0, read at commit dad8dbb; reimplemented, no code copied.
// Static: a JSX `<Card>` anywhere inside another `<Card>`'s element, its
// slot props included. Render: like impeccable, a card is read off the
// computed box rather than its name, so a surface built some other way, or a
// Card handed in through a variable, fails too.

import type { Rule } from "eslint";
import { inPage, type RenderFinding, type RenderRule } from "../render.ts";
import { help } from "../rules-md.ts";

export const id = "nested-cards";

// ESTree's JSX nodes, as far as the rule reads them.
type JsxNode = {
  type: string;
  parent?: JsxNode;
  openingElement?: { name: { type: string; name?: string } };
};

const isCard = (node: JsxNode) =>
  node.type === "JSXElement" &&
  node.openingElement!.name.type === "JSXIdentifier" &&
  node.openingElement!.name.name === "Card";

export const lint: Rule.RuleModule = {
  meta: {
    type: "problem",
    docs: { description: help(id), url: "lint/taste/RULES.md" },
    schema: [],
    messages: { nested: `A \`<Card>\` sits inside a \`<Card>\`. ${help(id)}` },
  },
  create(context) {
    return {
      JSXElement(node: Rule.Node) {
        const element = node as unknown as JsxNode;
        if (!isCard(element)) return;
        for (let up = element.parent; up; up = up.parent) {
          if (isCard(up)) {
            context.report({
              node: element.openingElement as unknown as Rule.Node,
              messageId: "nested",
            });
            return;
          }
        }
      },
    } as Rule.RuleListener;
  },
};

export const render: RenderRule = {
  name: id,
  help: help(id),
  check: (page, root) => inPage(page, root, findNestedCards),
};

// In the page: every card inside another card. A surface is a block-level
// box that paints an edge on three or more sides, or a fill other than what
// sits behind it, and is rounded; or one that casts a shadow. A surface
// painted only by its fill (a selected band, a tinted note) is a surface for
// what sits in it, but inside one it reads as emphasis, not a card, so only a
// box with an edge or a shadow counts as the inner card. Controls and what's
// inside them (a button's border, a checkbox's box) aren't cards, nor are
// inline boxes (a tag) or table parts (a selected row).
function findNestedCards(root: Element): RenderFinding[] {
  const controls =
    "a, button, label, input, select, textarea, summary, [role=button], [role=checkbox], [role=radio], [role=switch], [role=tab], [role=option], [role=menuitem]";
  const blocks = ["block", "flex", "grid", "flow-root", "list-item", "table"];
  const sides = ["Top", "Right", "Bottom", "Left"] as const;
  const { clear } = taste;

  // What sits behind an element: the background its parent reads on.
  const behind = (element: Element) =>
    taste.background(element.parentElement ?? element);

  const kind = (element: Element) => {
    const { width, height } = element.getBoundingClientRect();
    if (width === 0 || height === 0 || !element.checkVisibility()) return null;
    if (element.closest(controls)) return null;
    const style = getComputedStyle(element);
    if (!blocks.includes(style.display)) return null;
    const edges = sides.filter(
      (side) =>
        parseFloat(style[`border${side}Width`]) > 0 &&
        !["none", "hidden"].includes(style[`border${side}Style`]) &&
        !clear(style[`border${side}Color`])
    ).length;
    const shadow = style.boxShadow !== "none";
    const fill =
      !clear(style.backgroundColor) &&
      style.backgroundColor !== behind(element);
    const rounded = parseFloat(style.borderTopLeftRadius) > 0;
    if (shadow || (edges >= 3 && rounded)) return "card";
    if (fill && rounded) return "fill";
    return null;
  };

  const failures: RenderFinding[] = [];
  for (const element of root.querySelectorAll("*")) {
    if (kind(element) !== "card") continue;
    let outer = element.parentElement;
    while (outer && outer !== root && !kind(outer)) outer = outer.parentElement;
    if (!outer || outer === root) continue;
    const text = taste.words(element.textContent!);
    failures.push(
      taste.at(
        element,
        `${text ? taste.quote(text) : `<${element.tagName.toLowerCase()}>`} is a painted surface inside another painted surface.`
      )
    );
  }
  return failures;
}
