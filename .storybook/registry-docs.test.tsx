// Every library component's Docs page says what its registry entry says, word
// for word (#367): the entries the generator reads, loaded as it loads them.
// A page's description is the entry's use line and its props table holds
// each prop's description, code-only props apart, and the entry's slots.

import { Markdown, PureArgsTable } from "@storybook/addon-docs/blocks";
import { composeStories, composeStory } from "@storybook/react-vite";
import { cleanup, render } from "@testing-library/react";
import { loadCsf } from "storybook/internal/csf-tools";
import { convert, ThemeProvider, themes } from "storybook/theming";
import { afterEach, describe, expect, it } from "vitest";
import { loadRegistry } from "../generator/registry.ts";
import preview from "./preview.tsx";

afterEach(cleanup);

const registry = await loadRegistry();

const modules = import.meta.glob<Parameters<typeof composeStories>[0]>(
  "../src/components/*/*.stories.tsx",
  { eager: true }
);
const sources = import.meta.glob<string>(
  ["../src/components/*/*.stories.tsx", "../src/screens/*/*.stories.tsx"],
  { eager: true, query: "?raw", import: "default" }
);

const storiesFile = (name: string) =>
  `../src/components/${name}/${name}.stories.tsx`;

// Whether Storybook's indexer gives the file a Docs page: it does when any
// of its stories carries the autodocs tag, which it reads without running
// the file.
function hasDocsPage(file: string): boolean {
  const csf = loadCsf(sources[file]!, {
    fileName: file,
    makeTitle: (title) => title ?? file,
  }).parse();
  return csf.indexInputs.some((input) => input.tags?.includes("autodocs"));
}

// The page's first story, composed as Storybook prepares it.
function primary(name: string): ReturnType<typeof composeStory> {
  const [first] = Object.values(
    composeStories(modules[storiesFile(name)]!, preview)
  );
  return first as ReturnType<typeof composeStory>;
}

// Text as the page shows it: Storybook renders descriptions as Markdown.
function shown(markdown: string): string {
  const { container, unmount } = render(<Markdown>{markdown}</Markdown>);
  const text = container.textContent;
  unmount();
  return text;
}

// The props table as the page shows it: each row's name, group and
// description, read from the rendered table.
function table(name: string) {
  const story = primary(name);
  const include = story.parameters.docs?.argTypes?.include as string[];
  const rows = Object.fromEntries(
    Object.entries(story.argTypes).filter(([key]) => include.includes(key))
  );
  const { container } = render(
    <ThemeProvider theme={convert(themes.light)}>
      <PureArgsTable rows={rows} />
    </ThemeProvider>
  );
  const shownRows = new Map<
    string,
    { group: string; description: string; type: string[] }
  >();
  let group = "";
  for (const row of container.querySelectorAll<HTMLElement>("tbody tr")) {
    // A group's row is titled with its toggle's text, "Hide <group> items";
    // its first cell holds the toggle, then the group's name.
    if (row.title) {
      group = row.querySelector("td")!.lastElementChild!.textContent;
      continue;
    }
    const [nameCell, descriptionCell] = row.querySelectorAll("td");
    // The cell holds the description, when there is one, above the type,
    // which shows each of a union's members on its own.
    const parts = [...descriptionCell!.children];
    shownRows.set(nameCell!.textContent.replace(/\*$/, "").trim(), {
      group,
      description: parts.length > 1 ? parts[0]!.textContent : "",
      type: [...parts.at(-1)!.querySelectorAll("*")]
        .filter((each) => each.children.length === 0)
        .map((each) => each.textContent),
    });
  }
  return shownRows;
}

const withStories = registry.entries.filter(
  (entry) => storiesFile(entry.name) in modules
);

it("gives every public component stories of its own", () => {
  const without = registry.entries
    .filter((entry) => !entry.internal && !(storiesFile(entry.name) in modules))
    .map((entry) => entry.name);
  expect(without).toEqual([]);
});

it("gives a Docs page to every component with stories and to no screen", () => {
  const pages = Object.keys(sources).filter(hasDocsPage).sort();
  expect(pages).toEqual(
    withStories.map((entry) => storiesFile(entry.name)).sort()
  );
});

describe.each(withStories)("$name's Docs page", (entry) => {
  it("describes it with its entry's use line", () => {
    const description = primary(entry.name).parameters.docs?.description
      ?.component as string;
    expect(shown(description)).toBe(entry.use);
  });

  it("lists each prop with its entry's description, and each slot", () => {
    const rows = table(entry.name);
    // A prop's type is checked on worked examples below.
    const props = Object.entries(entry.props.shape).map(([name, schema]) => [
      name,
      {
        group: entry.codeOnly?.includes(name) ? "code-only" : "props",
        description: schema.description,
        type: expect.any(Array),
      },
    ]);
    // A slot's type is the components it takes.
    // A slot's row is the prop that fills it, and the body slot is children.
    const slots = Object.entries(entry.slots ?? {}).map(([name, slot]) => [
      name === "body" ? "children" : name,
      {
        group: "slots",
        description: "",
        type: slot.allow ?? ["any component"],
      },
    ]);
    expect(Object.fromEntries(rows)).toEqual(
      Object.fromEntries([...props, ...slots])
    );
  });

  it(
    entry.internal
      ? "says another component renders it"
      : "doesn't call it internal",
    () => {
      const subtitle = primary(entry.name).parameters.docs?.subtitle;
      if (entry.internal) {
        expect(subtitle).toMatch(/rendered only by another component/);
      } else {
        expect(subtitle).toBeUndefined();
      }
    }
  );
});

// Each prop's type as its entry's schema spells it, on one of each kind.
it.each([
  ["Button", "intent", ['"primary"', '"secondary"', '"quiet"']],
  ["Button", "pending", ["boolean"]],
  ["Heading", "level", ["1", "2", "3"]],
  ["Checkbox", "checked", ["boolean", '"mixed"']],
  ["DataTable", "columns", ["string[]"]],
  ["DataTable", "selectionText", ["object"]],
  ["Amount", "value", ["number"]],
])("shows %s's %s as %j", (name, prop, type) => {
  expect(table(name).get(prop)?.type).toEqual(type);
});

// The rows are the props the component takes: Card fills its body slot
// from children.
it("names Card's rows for its props", () => {
  expect([...table("Card").keys()].sort()).toEqual([
    "children",
    "footer",
    "header",
    "result",
  ]);
});
