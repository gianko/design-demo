import { composeStories, type composeStory } from "@storybook/react-vite";
import { loadCsf } from "storybook/internal/csf-tools";
import { expect, it } from "vitest";
import { phone } from "./phone.ts";
import preview from "./preview.tsx";

const modules = import.meta.glob<Parameters<typeof composeStories>[0]>(
  ["../src/**/*.stories.tsx", "../gates/fixtures/*.stories.tsx"],
  { eager: true }
);
const sources = import.meta.glob<string>(
  ["../src/**/*.stories.tsx", "../gates/fixtures/*.stories.tsx"],
  { eager: true, query: "?raw", import: "default" }
);

// Each story with the tags Storybook indexes for it, read from the source
// without running it, as the gate's index.json has them, and its viewport
// global, from the composed story.
const stories = Object.entries(modules).flatMap(([file, module]) => {
  const composed = composeStories(module, preview) as Record<
    string,
    ReturnType<typeof composeStory>
  >;
  const csf = loadCsf(sources[file]!, {
    fileName: file,
    makeTitle: (title) => title ?? file,
  }).parse();
  return csf.indexInputs.map((input) => ({
    id: composed[input.exportName]!.id,
    indexed: input.tags ?? [],
    viewport: (
      composed[input.exportName]!.globals.viewport as
        { value?: string } | undefined
    )?.value,
  }));
});

// The gate renders a story at phone width by its indexed tag, and Storybook
// by its viewport global, so a story with one and not the other would show a
// reviewer a render the gate doesn't check (./phone.ts).
it.each(stories.map((story) => [story.id, story] as const))(
  "%s is on a phone in both Storybook and the gate, or in neither",
  (_, story) => {
    expect(story.viewport === phone).toBe(story.indexed.includes(phone));
  }
);

it("reads every stories file", () => {
  expect(Object.keys(sources)).toEqual(Object.keys(modules));
  expect(stories.some((story) => story.indexed.includes(phone))).toBe(true);
});
