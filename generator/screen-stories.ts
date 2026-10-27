// A generated screen's stories: the default, then one per declared screen
// state, each naming the fixture variant it renders. Every story also carries
// the declared states, so a confirmed action shows the data of the state it
// enters. The default story also declares the screen's actions, which the
// `action-transitions` taste rule clicks through
// (.storybook/screen-actions.ts). Each DataTable with a detail slot adds
// ADR 0011's open-sheet render: the default state with its first row's Sheet
// open. The render pass gates exactly these, and
// `pnpm keep` commits them beside the kept screen, so a kept screen is gated
// as it was generated (spec § Keep).
//
// The title's last segment is the slug, so `pnpm gate <slug>` selects them.

import type {
  ScreenAction,
  ScreenActionParameters,
} from "../.storybook/screen-actions.ts";
import { defaultState } from "../src/components/Screen/default-state.ts";
import type {
  HostedState,
  ScreenStateParameters,
} from "../src/components/Screen/screen-state.tsx";
import type { VariantName } from "../src/fixtures/fixtures.ts";
import type { UiNode, UiSpec } from "./ui-spec.ts";

export type ScreenStoriesInput = { slug: string; name: string } & Pick<
  UiSpec,
  "states" | "nodes" | "actions"
>;

// Each story's export name and the screen state it renders. The open-sheet
// renders come last, each named for the default state with the sheet open,
// which is also how a render pass's failure lines name it.
export function storyStates({
  states,
  nodes,
}: Pick<ScreenStoriesInput, "states" | "nodes">) {
  return [
    { exportName: pascalCase(defaultState), state: defaultState },
    ...states.map(({ name }) => ({
      exportName: pascalCase(name),
      state: name,
    })),
    ...openSheets(nodes).map(({ state }) => ({
      exportName: pascalCase(state),
      state,
    })),
  ];
}

// The open-sheet render (ADR 0011): for each DataTable with a detail slot,
// the default state with its first row's Sheet open, which the story's
// `openSheet` parameter sets from the start through DataTable's library test
// attribute, so no View Transition runs in the shot.
// Its index counts the tables with a detail slot that the default state
// shows, in document order (a parent's children in the UI spec's order), as
// the library counts them in the page. A modal Sheet covers the window, so
// the story fills it.
function openSheets(nodes: readonly UiNode[]) {
  const showsIn = shownIn(nodes);
  const children = (id: string | null) =>
    nodes.filter((node) => node.parent === id);
  const order: UiNode[] = [];
  const seen = new Set<UiNode>();
  const walk = (node: UiNode) => {
    if (seen.has(node)) return;
    seen.add(node);
    order.push(node);
    children(node.id).forEach(walk);
  };
  children(null).forEach(walk);
  return order
    .filter(
      (node) =>
        node.component === "DataTable" &&
        showsIn(node, defaultState) &&
        children(node.id).some((child) => child.slot === "detail")
    )
    .map((_, index) => ({
      index,
      state: `${defaultState}, sheet ${index === 0 ? "" : `${index + 1} `}open`,
    }));
}

// Whether a node shows in a state: it and every ancestor either have no
// `when` or name the state.
function shownIn(nodes: readonly UiNode[]) {
  const byId = new Map(nodes.map((node) => [node.id, node]));
  return (node: UiNode, state: string) => {
    const seen = new Set<UiNode>();
    for (
      let at: UiNode | undefined = node;
      at && !seen.has(at);
      at = at.parent === null ? undefined : byId.get(at.parent)
    ) {
      seen.add(at);
      if (at.when.length > 0 && !at.when.includes(state)) return false;
    }
    return true;
  };
}

// The story parameter the Storybook preview hands to ScreenHost (ADR 0011),
// in the library's own shape.
const parameter: keyof ScreenStateParameters = "screenState";
const actionsParameter: keyof ScreenActionParameters = "screenActions";
// And the declared states every story's host takes, so a confirmed action
// shows the data of the state it enters (the stagger).
const declaredParameter: keyof ScreenStateParameters = "screenStates";
// And which table's first row's Sheet starts open, for the open-sheet render.
const openSheetParameter: keyof ScreenStateParameters = "openSheet";

export function screenStories(input: ScreenStoriesInput) {
  const { slug, name, states, nodes } = input;
  const actions = screenActions(input);
  const sheets = new Map(
    openSheets(nodes).map(({ state, index }) => [state, index])
  );
  const stories = storyStates(input).map(({ exportName, state }) => {
    const declared = states.find((candidate) => candidate.name === state);
    const hosted: Record<keyof HostedState, string> | undefined = declared && {
      name: declared.name,
      fixture: declared.fixture,
    };
    const fields =
      hosted &&
      Object.entries(hosted)
        .map(([key, value]) => `${key}: ${JSON.stringify(value)}`)
        .join(", ");
    const sheet = sheets.get(state);
    const body = fields
      ? `{\n  parameters: {\n    ${parameter}: { ${fields} },\n  },\n}`
      : sheet !== undefined
        ? `{\n  parameters: { layout: "fullscreen", ${openSheetParameter}: ${sheet} },\n}`
        : state === defaultState && actions.length > 0
          ? `{\n  parameters: {\n    ${actionsParameter}: ${JSON.stringify(actions)},\n  },\n}`
          : "{}";
    return `export const ${exportName}: Story = ${body};\n`;
  });
  const declaredStates = states.map(
    ({ name: state, fixture }): Record<keyof HostedState, string> => ({
      name: state,
      fixture,
    })
  );
  const metaParameters =
    declaredStates.length > 0
      ? `\n  parameters: { ${declaredParameter}: ${JSON.stringify(declaredStates)} },`
      : "";
  return `// Written by \`pnpm keep\`: the default and one story per declared screen
// state, each with its fixture variant, then the default with each detail
// table's first row's Sheet open.
import type { Meta, StoryObj } from "@storybook/react-vite";
import { ${name} } from "./${name}.tsx";

const meta = {
  title: ${JSON.stringify(`Screens/${slug}`)},
  component: ${name},${metaParameters}
} satisfies Meta<typeof ${name}>;

export default meta;

type Story = StoryObj<typeof meta>;

${stories.join("\n")}`;
}

// Each declared action as the action-transitions rule clicks it: its
// Button's literal label, the first state (the default, then each declared
// one) its Button shows in, and the state and fixture variant of each
// outcome. Its Button is the Button node that runs it, or else its pending
// node.
function screenActions({
  states,
  nodes,
  actions,
}: Pick<UiSpec, "states" | "nodes" | "actions">): ScreenAction[] {
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const order = [defaultState, ...states.map((state) => state.name)];
  const showsIn = shownIn(nodes);
  const hosted = (state: string): HostedState => ({
    name: state,
    // A UI spec's fixtures are checked against the variants in gate 1.
    fixture: (states.find((each) => each.name === state)?.fixture ??
      "default") as VariantName,
  });
  return actions.map((action) => {
    const button =
      nodes.find(
        (node) => node.component === "Button" && node.action === action.name
      ) ?? byId.get(action.pending);
    const text = button?.props.find((prop) => prop.name === "text")?.value;
    let label: unknown = null;
    try {
      label = text === undefined ? null : JSON.parse(text);
    } catch {
      // Gate 1 rejects a value that isn't JSON; no label then.
    }
    return {
      name: action.name,
      label: typeof label === "string" ? label : null,
      from:
        (button && order.find((state) => showsIn(button, state))) ??
        defaultState,
      to: {
        success: hosted(action.to.success),
        failure: hosted(action.to.failure),
      },
    };
  });
}

// `reminder-sent` → `ReminderSent`.
export function pascalCase(name: string) {
  return name
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean)
    .map((part) => part[0]!.toUpperCase() + part.slice(1))
    .join("");
}
