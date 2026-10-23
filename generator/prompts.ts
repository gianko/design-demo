// The two steps' prompts (ADR 0003). Each step's system prompt is a cached
// prefix shared by every rep; the screen brief, and for the code step the UI
// spec, ride in the user turn after it. A prompt's hash covers its own words,
// its repair turn's (repair.ts) and the design brief: the registry has its own hash (ADR 0004), and both
// sit in the version tuple (ADR 0008). There are no example UI specs.

import { createHash } from "node:crypto";
import type Anthropic from "@anthropic-ai/sdk";
import type { LibraryRegistry } from "./registry.ts";
import { repairWording } from "./repair.ts";
import type { ScreenBrief } from "./screen-brief.ts";
import type { UiSpec } from "./ui-spec.ts";

const specInstructions = `You turn a screen brief into a UI spec: a flat list of library component nodes that the code step builds one screen from. You write no code.

- Use only the components in the registry below. Each node names one, and its props match that component's props schema exactly: every required prop, and no prop the schema doesn't list.
- Exactly one node is the root: a Screen, with parent null and slot null. Every other node has a parent and sits in one of the parent's named slots. A slot with an allow-list takes only the components it lists, and a component with no slots takes no children.
- Siblings render in the order they appear in the list.
- Each prop is a name and its value written as JSON: the string Paid is "\\"Paid\\"", and true is "true".
- audience is the screen brief's audience, and the Screen's audience prop is the same.
- Every user-facing string is literal copy in a prop, in the design brief's voice: sentence case, plain-spoken. Where the screen brief gives exact copy, use it word for word.
- Declare a screen state in states, or an action in actions, only when the screen brief asks for one. A node's when lists the states it shows in, and is empty to show it in every state. action is null unless the node runs a declared action.
- Each id is a short kebab-case name for what its node is.`;

const codeInstructions = `You turn a UI spec into one React screen: a whole TSX file built only from library components, following the UI spec exactly. The screen brief comes with it for intent.

- Reply with the whole file in one \`\`\`tsx block, and nothing else.
- Import every component from the library barrel, exactly as: import { … } from "../../index.ts";
- Export one function component with the name you're given, taking no props, and export nothing else.
- Render each node as its component with exactly the props it gives, each value as its JSON says. Don't add, drop or reword nodes, props or copy.
- A node in its parent's body slot is one of the parent's children; a node in any other slot is passed as the parent's prop named after that slot. Siblings keep their order in the node list.
- No intrinsic elements (div, span, p and the rest), no className and no style: the library does all the styling.
- The screen holds no state of its own; the library's hooks change it, so every change is a View Transition. Read the screen state with const { state } = useScreenState(); it is "default" until an action settles, and a node with a non-empty when renders only while state is one of those states. Wire each declared action as const <action> = useAction("<operation>", { success: "<to.success>", failure: "<to.failure>" }): the node that runs it calls <action>.run(…) with the operation's arguments, and its pending node shows <action>.pending. Never call useState, useReducer, startViewTransition or an operation yourself.`;

// The user turns, as templates, so their words hash the same under any
// runtime.
const specUser = "Write the UI spec for this screen brief.\n\n{brief}";
const codeUser =
  "Write the screen {name} from this UI spec.\n\n```json\n{uiSpec}\n```\n\nThe screen brief it came from:\n\n{brief}";

// One pass, so a brief that happens to contain "{name}" stays as written.
function fill(template: string, values: Record<string, string>) {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    Object.hasOwn(values, key) ? values[key]! : match
  );
}

export type StepPrompt<A extends unknown[]> = {
  system: Anthropic.TextBlockParam[];
  user: (...args: A) => string;
  hash: string;
};

export function specPrompt(
  designBrief: string,
  registry: LibraryRegistry,
  wireSchemaJson: string
): StepPrompt<[ScreenBrief]> {
  return {
    system: cached([
      specInstructions,
      `<design_brief>\n${designBrief}\n</design_brief>`,
      `<registry>\n${registry.serialized}\n</registry>`,
      `<wire_schema>\n${wireSchemaJson}\n</wire_schema>`,
    ]),
    user: (brief) => fill(specUser, { brief: brief.text }),
    hash: hash(specInstructions, designBrief, specUser, repairWords("spec")),
  };
}

export function codePrompt(
  designBrief: string,
  registry: LibraryRegistry
): StepPrompt<[ScreenBrief, string, UiSpec]> {
  return {
    system: cached([
      codeInstructions,
      `<design_brief>\n${designBrief}\n</design_brief>`,
      `<registry>\n${registry.serialized}\n</registry>`,
    ]),
    user: (brief, name, uiSpec) =>
      fill(codeUser, {
        brief: brief.text,
        name,
        uiSpec: JSON.stringify(uiSpec),
      }),
    hash: hash(codeInstructions, designBrief, codeUser, repairWords("code")),
  };
}

// One breakpoint, on the last block, caches the whole prefix.
function cached(texts: string[]): Anthropic.TextBlockParam[] {
  return texts.map((text, i) =>
    i === texts.length - 1
      ? { type: "text", text, cache_control: { type: "ephemeral" } }
      : { type: "text", text }
  );
}

function hash(...parts: string[]) {
  return createHash("sha256").update(JSON.stringify(parts)).digest("hex");
}

function repairWords(step: "spec" | "code") {
  const { intro, help, ask } = repairWording;
  return JSON.stringify({ intro, help, ask, ...repairWording[step] });
}
