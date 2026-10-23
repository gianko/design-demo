// A generated screen's stories: the default, then one per declared screen
// state, each naming the fixture variant it renders. The render pass gates
// exactly these, and `pnpm keep` commits them beside the kept screen, so a
// kept screen is gated as it was generated (spec § Keep).
//
// The title's last segment is the slug, so `pnpm gate <slug>` selects them.

import type { UiSpec } from "./ui-spec.ts";

export type ScreenStoriesInput = {
  slug: string;
  name: string;
  states: UiSpec["states"];
};

// Each story's export name and the screen state it renders.
export function storyStates({ states }: Pick<ScreenStoriesInput, "states">) {
  return [
    { exportName: "Default", state: "default" },
    ...states.map(({ name }) => ({
      exportName: pascalCase(name),
      state: name,
    })),
  ];
}

export function screenStories({ slug, name, states }: ScreenStoriesInput) {
  const stories = storyStates({ states }).map(({ exportName, state }) => {
    const declared = states.find((candidate) => candidate.name === state);
    // Applying the variant is the library's job once screen states exist
    // (ADR 0011); the story names it in its parameters.
    const body = declared
      ? `{\n  parameters: {\n    screenState: { name: ${JSON.stringify(declared.name)}, fixture: ${JSON.stringify(declared.fixture)} },\n  },\n}`
      : "{}";
    return `export const ${exportName}: Story = ${body};\n`;
  });
  return `// Written by \`pnpm keep\`: the default and one story per declared screen
// state, each with its fixture variant.
import type { Meta, StoryObj } from "@storybook/react-vite";
import { ${name} } from "./${name}.tsx";

const meta = {
  title: ${JSON.stringify(`Screens/${slug}`)},
  component: ${name},
} satisfies Meta<typeof ${name}>;

export default meta;

type Story = StoryObj<typeof meta>;

${stories.join("\n")}`;
}

// `reminder-sent` → `ReminderSent`.
export function pascalCase(name: string) {
  return name
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean)
    .map((part) => part[0]!.toUpperCase() + part.slice(1))
    .join("");
}
