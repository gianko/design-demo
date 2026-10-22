// What the static taste rules read, in either language they run on. In TSX
// and TS, every string is a possible class list (a className, a tv() slot, a
// template-literal part); JSX text is copy, not classes. In CSS, an @apply is
// a class list, and each declaration is read with the selector it sits under.

import type { Rule } from "eslint";

export type Handlers = {
  classList?(text: string, node: unknown, selector: string): void;
  declaration?(
    property: string,
    value: string,
    node: unknown,
    selector: string
  ): void;
  keyframes?(name: string, frames: Keyframe[], node: unknown): void;
};

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

export function sourceVisitors(
  context: Rule.RuleContext,
  handlers: Handlers
): Rule.RuleListener {
  if ((context.sourceCode.ast as { type: string }).type === "StyleSheet") {
    return cssVisitors(context, handlers) as Rule.RuleListener;
  }
  return {
    Literal(node) {
      if (typeof node.value === "string" && !isCopy(node)) {
        handlers.classList?.(node.value, node, "");
      }
    },
    TemplateElement(node) {
      if (!isCopy(node)) {
        handlers.classList?.(node.value.cooked ?? node.value.raw, node, "");
      }
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
