// What the static taste rules read, in either language they run on. In TSX,
// every string is a possible class list (a className, a tv() slot, a
// template-literal part); JSX text is copy, not classes. In CSS, an @apply is
// a class list, and each declaration is read with the selector it sits under.

import type { Rule } from "eslint";
import { tvRenders, type Render } from "./tv.ts";

export type Handlers = {
  // Each class list on its own.
  classList?(text: string, node: unknown, selector: string): void;
  // The ways class lists land on one element together: every slot of a tv()
  // call under every option set (lint/taste/tv.ts), or any other class list
  // alone, under no options.
  classLists?(renders: Render[]): void;
  declaration?(
    property: string,
    value: string,
    node: unknown,
    selector: string
  ): void;
  keyframes?(name: string, frames: Keyframe[], node: unknown): void;
};

export type { Render };

// One keyframe selector's declarations; `0%, 100%` gives two.
export type Keyframe = { offset: number; declarations: Map<string, string> };

// CSSTree's nodes, as far as the rules read them.
type CssNode = {
  type: string;
  name?: string;
  property?: string;
  prelude?: unknown;
  value?: unknown;
};

// Reports a finding on a node a handler was given, under the rule's message
// `messageId`, which reads the finding as `{{finding}}`.
export function reporter(context: Rule.RuleContext, messageId: string) {
  return (node: unknown, finding: string) =>
    context.report({ node: node as Rule.Node, messageId, data: { finding } });
}

export function sourceVisitors(
  context: Rule.RuleContext,
  handlers: Handlers
): Rule.RuleListener {
  if ((context.sourceCode.ast as { type: string }).type === "StyleSheet") {
    return cssVisitors(context, handlers) as Rule.RuleListener;
  }
  // The class lists a tv() call puts together, read when the call is
  // entered, before the strings inside it.
  const inTv = new Set<unknown>();
  const alone = (text: string, node: Rule.Node) => {
    handlers.classList?.(text, node, "");
    if (!inTv.has(node)) {
      handlers.classLists?.([{ lists: [{ text, node }], options: "" }]);
    }
  };
  return {
    CallExpression(node) {
      const tv = handlers.classLists && tvRenders(node);
      if (!tv) return;
      for (const list of tv.lists) inTv.add(list);
      handlers.classLists!(
        tv.renders.map(({ lists, options }) => ({
          lists: lists.filter((list) => !isCopy(list.node)),
          options,
        }))
      );
    },
    Literal(node) {
      if (typeof node.value === "string" && !isCopy(node)) {
        alone(node.value, node);
      }
    },
    TemplateElement(node) {
      if (!isCopy(node)) alone(node.value.cooked ?? node.value.raw, node);
    },
  };
}

// A string that is copy rather than classes: the value of any JSX attribute
// but className, or words with capitals in them (classes are lower case).
function isCopy(node: Rule.Node): boolean {
  const text =
    node.type === "Literal"
      ? String(node.value)
      : node.type === "TemplateElement"
        ? node.value.raw
        : "";
  if (/(?:^|\s)[^\s[]*[A-Z]/.test(text)) return true;
  for (let parent = node.parent; parent; parent = parent.parent) {
    if (parent.type === ("JSXAttribute" as string)) {
      const { name } = parent as unknown as { name: { name: unknown } };
      return name.name !== "className" && name.name !== "class";
    }
  }
  return false;
}

function cssVisitors(context: Rule.RuleContext, handlers: Handlers) {
  const text = (node: unknown) =>
    node ? context.sourceCode.getText(node as never) : "";
  // The selectors and at-rule preludes the current node is nested under.
  const scopes: string[] = [];
  const selector = () => scopes.join(" ");

  return {
    Rule(node: CssNode) {
      scopes.push(text(node.prelude));
    },
    "Rule:exit"() {
      scopes.pop();
    },
    Atrule(node: CssNode) {
      if (node.name === "apply") {
        handlers.classList?.(text(node.prelude), node, selector());
        handlers.classLists?.([
          {
            lists: [{ text: text(node.prelude), node: node as Rule.Node }],
            options: "",
          },
        ]);
      }
      if (/^(?:-webkit-)?keyframes$/.test(node.name!)) {
        handlers.keyframes?.(text(node.prelude), keyframes(text(node)), node);
      }
      scopes.push(`@${node.name} ${text(node.prelude)}`);
    },
    "Atrule:exit"() {
      scopes.pop();
    },
    Declaration(node: CssNode) {
      if (node.property!.startsWith("--")) return;
      handlers.declaration?.(
        node.property!.toLowerCase(),
        text(node.value),
        node,
        selector()
      );
    },
  };
}

// An @keyframes rule's frames, from its source text.
function keyframes(source: string): Keyframe[] {
  const body = source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^[^{]*\{/, "");
  return [...body.matchAll(/([^{}]+)\{([^{}]*)\}/g)].flatMap(
    ([, selectors, block]) => {
      const declarations = new Map(
        block!
          .split(";")
          .map((declaration) => declaration.split(":"))
          .filter((parts) => parts.length >= 2)
          .map(([property, ...value]) => [
            property!.trim().toLowerCase(),
            value.join(":").trim(),
          ])
      );
      return selectors!.split(",").map((selector) => {
        const s = selector.trim();
        const offset = s === "from" ? 0 : s === "to" ? 100 : parseFloat(s);
        return { offset, declarations };
      });
    }
  );
}
