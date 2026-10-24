// screens/screen-state-via-library (ADR 0011): a generated screen holds no
// state of its own, so nothing changes outside a View Transition. It calls
// no `useState`, `useReducer` or `startViewTransition` and none of the
// fixtures module's mock operations, however it reaches them (bare, through
// a namespace or an object, by a computed key, or imported or destructured
// under another name); the library's `useScreenState` and `useAction` do all
// of it. Nor does it render `ScreenHost`: whatever hosts the screen (a story,
// the gate harness, an app) holds its state and fixture variant.

import type { Rule } from "eslint";
import { operationNames } from "../../src/fixtures/fixtures.ts";

const host = "ScreenHost";
const stateful = ["useState", "useReducer", "startViewTransition"];
const banned = new Set<string>([...stateful, ...operationNames, host]);

const noOwnState =
  "A generated screen holds no state of its own (ADR 0011). Read the screen state from useScreenState, and let library components own theirs.";
const help: Record<string, string> = {
  useState: noOwnState,
  useReducer: noOwnState,
  startViewTransition:
    "The library runs every View Transition (ADR 0011). Change the screen state through useAction, which enters its to.success or to.failure state for you.",
  [host]:
    "Whatever hosts a generated screen renders its ScreenHost (ADR 0011), so the screen renders only its Screen.",
};
const operationHelp = (name: string) =>
  `Run "${name}" through useAction("${name}", { success, failure }) and call its run (ADR 0011), so the screen enters its state through a View Transition.`;

const messageFor = (name: string) => help[name] ?? operationHelp(name);

type Node = Parameters<NonNullable<Rule.RuleListener["CallExpression"]>>[0];
type Expression = Node["callee"];

// A key as written: `sendReminder`, `"sendReminder"` or `` `sendReminder` ``.
function keyName(key: Expression, computed: boolean): string | undefined {
  if (!computed && key.type === "Identifier") return key.name;
  if (key.type === "Literal" && typeof key.value === "string") return key.value;
  if (key.type === "TemplateLiteral" && key.expressions.length === 0) {
    return key.quasis[0]!.value.cooked ?? undefined;
  }
  return undefined;
}

// The name a call reaches: `useState(…)`, `React.useState(…)`,
// `document.startViewTransition(…)`, `operations.sendReminder(…)`,
// `operations["sendReminder"](…)`.
function calledName(callee: Expression): string | undefined {
  if (callee.type === "Identifier") return callee.name;
  if (callee.type === "MemberExpression") {
    return keyName(callee.property as Expression, callee.computed);
  }
  return undefined;
}

// A JSX element's name: `ScreenHost` or `Library.ScreenHost`.
type JsxName =
  | { type: "JSXIdentifier"; name: string }
  | { type: "JSXMemberExpression"; property: { name: string } }
  | { type: string };

function elementName(name: JsxName): string | undefined {
  if (name.type === "JSXIdentifier" && "name" in name) return name.name;
  if (name.type === "JSXMemberExpression" && "property" in name) {
    return name.property.name;
  }
  return undefined;
}

export const screenStateViaLibrary: Rule.RuleModule = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow screen-state changes outside the library's useScreenState and useAction, and a generated screen rendering its own ScreenHost.",
    },
    schema: [],
  },
  create(context) {
    const report = (node: Rule.Node | Expression, name: string) =>
      context.report({ node, message: messageFor(name) });
    return {
      CallExpression(node) {
        const name = calledName(node.callee);
        if (name && banned.has(name)) report(node.callee, name);
      },
      // Imported under another name, the calls above wouldn't know it.
      ImportSpecifier(node) {
        const imported =
          node.imported.type === "Identifier"
            ? node.imported.name
            : String(node.imported.value);
        if (banned.has(imported) && node.local.name !== imported) {
          report(node, imported);
        }
      },
      // Nor destructured under another name: `{ sendReminder: remind }`.
      Property(node) {
        if (node.parent.type !== "ObjectPattern") return;
        const name = keyName(node.key as Expression, node.computed);
        const local = node.value.type === "Identifier" ? node.value.name : "";
        if (name && banned.has(name) && local !== name) report(node, name);
      },
      // ESLint's types stop at ESTree, which has no JSX.
      JSXOpeningElement(node: Rule.Node) {
        const { name } = node as unknown as { name: JsxName & Rule.Node };
        if (elementName(name) === host) report(name, host);
      },
    };
  },
};
