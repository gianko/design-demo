// The two steps' prompts (ADR 0003). Each step's system prompt is a cached
// prefix shared by every rep; the screen brief, and for the code step the UI
// spec, ride in the user turn after it, which carries a breakpoint of its own
// (generate.ts). A prompt's hash covers its own words, its repair turn's
// (repair.ts), the design brief and, for the spec step, the fixture paths, or
// for the code step, the fixture types: the registry has its own hash (ADR
// 0004), and both sit in the version tuple (ADR 0008). There are no example
// UI specs.

import { createHash } from "node:crypto";
import type Anthropic from "@anthropic-ai/sdk";
import type { Step } from "./config.ts";
import { screenVariants } from "../src/fixtures/fixtures.ts";
import { rowSlots } from "./gate1.ts";
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
- Every user-facing string you write is literal copy in a prop, in the design brief's voice: sentence case, plain-spoken. Where the screen brief gives exact copy, use it word for word.
- Data is bound, never copied: a value that comes from the fixtures (an amount, a status, a name, a date's label) is the prop value {"bind":"<path>"}, written as JSON like any other, so binding the due date's label is "{\\"bind\\":\\"overdueInvoice.dueLabel\\"}". The paths each fixture variant can bind are listed after the screen brief. A bound path must resolve, to a value the prop takes, in the fixture variant of every screen state its node shows in; where a variant lacks the data, show the node only in the states that have it. A path starting row. resolves only inside a DataTable's cell or detail slot.
- Declare a screen state in states, or an action in actions, only when the screen brief asks for one. Each state's fixture is one of the listed fixture variants. A node's when lists the states it shows in, and is empty to show it in every state. action is null unless the node runs a declared action.
- Each id is a short kebab-case name for what its node is.`;

const codeInstructions = `You turn a UI spec into one React screen: a whole TSX file built only from library components, following the UI spec exactly. The screen brief comes with it for intent.

- Reply with the whole file in one \`\`\`tsx block, and nothing else.
- Import every component from the library barrel, exactly as: import { … } from "../../index.ts";
- Export one function component with the name you're given, taking no props, and export nothing else.
- Render each node as its component with exactly the props it gives, each value as its JSON says. Don't add, drop or reword nodes, props or copy. The one exception is a prop the registry lists under its component's codeOnly: no UI spec gives it, and you set it yourself, as below.
- A prop whose value is {"bind":"<path>"} reads that path from the fixture data, which you get with const data = useFixtureData(): {"bind":"overdueInvoice.dueLabel"} is data.overdueInvoice.dueLabel. Where the path runs through a value its type in <fixture_types> allows to be null, render the node only once it's there, even when every state in the screen brief has it, since TypeScript checks the screen against that type, as in {data.overdueInvoice && <Text text={data.overdueInvoice.dueLabel} />}. Never write fixture values in as literals.
- A node in its parent's body slot is one of the parent's children; a node in any other slot, except a DataTable's row slots, is passed as the parent's prop named after that slot. Siblings keep their order in the node list.
- A node in a DataTable's ${rowSlots.join(" or ")} slot is passed as a function of the row: the slot's nodes, in order, are what it returns, as in cell={(row) => <><Text text={row.number} /><Amount … /></>}. Inside it, a {"bind":"row.<path>"} prop reads row.<path> from that function's argument, not from the fixture data; every other bound path still reads data.<path>.
- No intrinsic elements (div, span, p and the rest), no className and no style: the library does all the styling.
- The screen holds no state of its own; the library's hooks change it, so every change is a View Transition. Read the screen state with const { state } = useScreenState(); it is "default" until an action settles, and a node with a non-empty when renders only while state is one of those states. Wire each declared action as const <action> = useAction("<operation>", { success: "<to.success>", failure: "<to.failure>" }): the node that runs it calls <action>.run(…) with the operation's arguments, read from the fixture data like a bound prop (sendReminder takes the invoice's id, as in sendReminder.run(data.overdueInvoice.id)), except that payInvoices, sendReminders and retryPayments take the selected rows' ids: call const selected = useSelectedRows() at the top of the screen and pass selected to the action's run, as in payInvoices.run(selected). Its pending node, a Button, takes its codeOnly pending prop as pending={<action>.pending}. Never call useState, useReducer, startViewTransition or an operation yourself, and never render a ScreenHost: whatever hosts the screen does.`;

// The user turns, as templates, so their words hash the same under any
// runtime.
const specUser =
  "Write the UI spec for this screen brief.\n\n{brief}\n\nThe paths a prop can bind in each fixture variant, with their values:\n\n{fixtures}";
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

// `fixtures` is each fixture variant's data by name. The paths of the
// variants a screen brief may use, `default` and its own, ride in its user
// turn, so the cached prefix stays the design brief, the registry and the
// wire schema (spec § Gate 1 and the spec step); listing every variant's
// sent bulk-pay's turn to 297k tokens (#275). The hash covers every
// variant's paths, since they steer the model as the words do, and stays one
// version per run whichever briefs it runs.
export function specPrompt(
  designBrief: string,
  registry: LibraryRegistry,
  wireSchemaJson: string,
  fixtures: Readonly<Record<string, unknown>>
): StepPrompt<[ScreenBrief]> {
  const pathListing = (variants: Readonly<Record<string, unknown>>) =>
    Object.entries(variants)
      .map(([variant, data]) =>
        [`Fixture variant "${variant}":`, ...bindable(data)].join("\n")
      )
      .join("\n\n");
  return {
    system: cached([
      specInstructions,
      `<design_brief>\n${designBrief}\n</design_brief>`,
      `<registry>\n${registry.serialized.spec}\n</registry>`,
      `<wire_schema>\n${wireSchemaJson}\n</wire_schema>`,
    ]),
    user: (brief) =>
      fill(specUser, {
        brief: brief.text,
        fixtures: pathListing(screenVariants(fixtures, brief.slug)),
      }),
    hash: hash(
      specInstructions,
      designBrief,
      specUser,
      pathListing(fixtures),
      repairWords("spec")
    ),
  };
}

// One `- <path>: <value>` line per value a binding can reach: down through
// objects and arrays (by index) to each scalar, empty array or null.
function bindable(value: unknown, path = ""): string[] {
  const entries =
    typeof value === "object" && value !== null ? Object.entries(value) : [];
  if (entries.length === 0) return [`- ${path}: ${JSON.stringify(value)}`];
  return entries.flatMap(([key, child]) =>
    bindable(child, path ? `${path}.${key}` : key)
  );
}

// `fixtureTypes` is src/fixtures/types.ts as written: the type gate 3 checks
// the screen's reads against, so the step knows which paths can be null.
export function codePrompt(
  designBrief: string,
  registry: LibraryRegistry,
  fixtureTypes: string
): StepPrompt<[ScreenBrief, string, UiSpec]> {
  return {
    system: cached([
      codeInstructions,
      `<design_brief>\n${designBrief}\n</design_brief>`,
      `<registry>\n${registry.serialized.code}\n</registry>`,
      `<fixture_types>\n${fixtureTypes}\n</fixture_types>`,
    ]),
    user: (brief, name, uiSpec) =>
      fill(codeUser, {
        brief: brief.text,
        name,
        uiSpec: JSON.stringify(uiSpec),
      }),
    hash: hash(
      codeInstructions,
      designBrief,
      codeUser,
      fixtureTypes,
      repairWords("code")
    ),
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

function repairWords(step: Step) {
  const { intro, help, ask } = repairWording;
  return JSON.stringify({ intro, help, ask, ...repairWording[step] });
}
