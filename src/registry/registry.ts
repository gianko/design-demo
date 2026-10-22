// The registry as the generator sees it (ADR 0004): serialized once into the
// spec step's cached system prefix.
import { createHash } from "node:crypto";
import { z } from "zod";
import type { RegistryEntry } from "./entry.ts";

export function defineRegistry<const E extends readonly RegistryEntry[]>(
  entries: E
) {
  // Code-point order, so the hash doesn't depend on the machine's locale.
  const sorted = [...entries].sort((a, b) => (a.name < b.name ? -1 : 1));
  const names = sorted.map((entry) => entry.name);
  const twice = names.find((name, i) => names[i + 1] === name);
  if (twice !== undefined) {
    throw new Error(`"${twice}" is registered twice`);
  }
  const serialized = JSON.stringify(
    sorted.map((entry) => ({
      name: entry.name,
      use: entry.use,
      props: propsSchema(entry),
      slots: entry.slots ?? {},
    })),
    null,
    2
  );
  // The registry version in every eval results file's version tuple.
  const hash = createHash("sha256").update(serialized).digest("hex");
  // The wire schema's `component` field: only registered names parse.
  const component = z.enum(names as [E[number]["name"]]);
  return { entries: sorted, serialized, hash, component };
}

// Props as the spec step writes them, so a defaulted prop reads as optional.
function propsSchema(entry: RegistryEntry) {
  const schema = z.toJSONSchema(entry.props, { io: "input" });
  // The same dialect line in every entry is only noise in the prompt.
  delete schema.$schema;
  return schema;
}
