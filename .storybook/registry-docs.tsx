// A library component's Docs page, read from its registry entry (ADR 0004),
// the same entry the generator reads as its component docs, so Storybook,
// the generator and the props type share one source. A component's meta
// turns its page on with `tags: ["autodocs"]`, written there because
// Storybook's indexer reads tags without running the file, and spreads in
// registryDocs(entry). Screens and generated stories carry no such tag, so
// they get no page.
import {
  ArgTypes,
  Description,
  Primary,
  Subtitle,
  Title,
} from "@storybook/addon-docs/blocks";
import type { InputType, Parameters } from "storybook/internal/types";
import { z } from "zod";
import type { RegistryEntry } from "../src/registry/entry.ts";

// The props table's groups. A code-only prop is set by the code step and
// never by a UI spec (ADR 0011); a slot holds other components.
const category = {
  prop: "props",
  codeOnly: "code-only",
  slot: "slots",
} as const;

// An internal entry's subtitle: the spec step never sees it.
const internalNote =
  "Internal: rendered only by another component, never named in a UI spec.";

// What a slot takes, as its row's type: the components it allows.
function slotType(allow: readonly string[] | undefined): string {
  return allow ? allow.join(" | ") : "any component";
}

type JsonSchema = {
  type?: string;
  enum?: unknown[];
  const?: unknown;
  anyOf?: JsonSchema[];
  items?: JsonSchema;
};

// A prop's type, read from the JSON schema the generator's prompt holds,
// since docgen can't follow PropsOf to the component's props type.
function propType(schema: JsonSchema): string {
  if (schema.enum) return schema.enum.map((v) => JSON.stringify(v)).join(" | ");
  if (schema.const !== undefined) return JSON.stringify(schema.const);
  if (schema.anyOf) return schema.anyOf.map(propType).join(" | ");
  if (schema.type === "array" && schema.items) {
    return `${propType(schema.items)}[]`;
  }
  return schema.type ?? "unknown";
}

// The registry's text is plain prose, but the page renders descriptions as
// Markdown, where DataTable's "row.* … row.*" would turn italic and lose its
// asterisks. A backslash before each ASCII punctuation mark shows it as
// written.
function escapeMarkdown(text: string): string {
  return text.replace(/[!-/:-@[-`{-~]/g, "\\$&");
}

// The page shows only the primary story, never several in one document, so
// no two Screens' announce regions or Toasts share it, and the theme and
// density decorators wrap it as they wrap a story's own canvas. Shown inline
// its play function doesn't run (docs autoplay is off); shown in an iframe
// of its own, as Sheet's and Toast's are, it runs as on the story's canvas,
// and only reads (ADR 0012).
function Page() {
  return (
    <>
      <Title />
      <Subtitle />
      <Description />
      <Primary />
      <ArgTypes />
    </>
  );
}

// The meta's parameters and argTypes; `parameters` holds the meta's own
// others, with any `docs` ones merged into the page's.
export function registryDocs(
  entry: RegistryEntry,
  { docs, ...parameters }: Parameters = {}
): { parameters: Parameters; argTypes: Record<string, InputType> } {
  const codeOnly = new Set(entry.codeOnly);
  const json = z.toJSONSchema(entry.props) as {
    properties?: Record<string, JsonSchema>;
  };
  const props = Object.entries(entry.props.shape).map(
    ([name, schema]): [string, InputType] => [
      name,
      {
        description: escapeMarkdown(schema.description ?? ""),
        table: {
          category: codeOnly.has(name) ? category.codeOnly : category.prop,
          type: { summary: propType(json.properties?.[name] ?? {}) },
        },
      },
    ]
  );
  // A slot's row is named for the prop that fills it: the body slot is
  // children, every other slot a prop of its own name (Card's header).
  const slots = Object.entries(entry.slots ?? {}).map(
    ([name, slot]): [string, InputType] => [
      name === "body" ? "children" : name,
      {
        description: "",
        table: {
          category: category.slot,
          type: { summary: slotType(slot.allow) },
        },
      },
    ]
  );
  const rows = [...props, ...slots];
  return {
    parameters: {
      ...parameters,
      docs: {
        ...docs,
        page: Page,
        description: { component: escapeMarkdown(entry.use) },
        ...(entry.internal && { subtitle: internalNote }),
        // Only the registry's rows, so a story's args can't add one the
        // entry doesn't have.
        argTypes: { include: rows.map(([name]) => name) },
      },
    },
    argTypes: Object.fromEntries(rows),
  };
}
