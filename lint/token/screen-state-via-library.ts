// screens/screen-state-via-library (ADR 0011): a generated screen holds no
// state of its own, so nothing changes outside a View Transition. It calls
// no `useState`, `useReducer` or `startViewTransition` and none of the
// fixtures module's mock operations, however it reaches them (bare, through
// a namespace or an object, or imported under another name); the library's
// `useScreenState` and `useAction` do all of it.

import type { Rule } from "eslint";
import { operationNames } from "../../src/fixtures/fixtures.ts";

const stateful = ["useState", "useReducer", "startViewTransition"];
const banned = new Set<string>([...stateful, ...operationNames]);

const help: Record<string, string> = {
  useState:
    "A generated screen holds no state of its own (ADR 0011). Read the screen state from useScreenState, and let library components own theirs.",
  useReducer:
    "A generated screen holds no state of its own (ADR 0011). Read the screen state from useScreenState, and let library components own theirs.",
  startViewTransition:
    "The library runs every View Transition (ADR 0011). Change the screen state through useAction, which enters its to.success or to.failure state for you.",
};
const operationHelp = (name: string) =>
  `Run "${name}" through useAction("${name}", { success, failure }) and call its run (ADR 0011), so the screen enters its state through a View Transition.`;

const messageFor = (name: string) => help[name] ?? operationHelp(name);

// The name a call reaches: `useState(…)`, `React.useState(…)`,
// `document.startViewTransition(…)`, `operations.sendReminder(…)`.
type Callee = Parameters<
  NonNullable<Rule.RuleListener["CallExpression"]>
>[0]["callee"];

function calledName(callee: Callee): string | undefined {
  if (callee.type === "Identifier") return callee.name;
  if (
    callee.type === "MemberExpression" &&
    !callee.computed &&
    callee.property.type === "Identifier"
  ) {
    return callee.property.name;
  }
  return undefined;
}

export const screenStateViaLibrary: Rule.RuleModule = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow screen-state changes outside the library's useScreenState and useAction.",
    },
    schema: [],
  },
  create(context) {
    return {
      CallExpression(node) {
        const name = calledName(node.callee);
        if (name && banned.has(name)) {
          context.report({ node: node.callee, message: messageFor(name) });
        }
      },
      // Imported under another name, the calls above wouldn't know it.
      ImportSpecifier(node) {
        const imported =
          node.imported.type === "Identifier"
            ? node.imported.name
            : String(node.imported.value);
        if (banned.has(imported) && node.local.name !== imported) {
          context.report({ node, message: messageFor(imported) });
        }
      },
    };
  },
};
