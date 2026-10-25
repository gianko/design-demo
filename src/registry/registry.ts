// The registry as the generator sees it (ADR 0004): serialized once per step
// into that step's cached system prefix.
import { createHash } from "node:crypto";
import { z } from "zod";
import { type RegistryEntry, specProps } from "./entry.ts";

export function defineRegistry<const E extends readonly RegistryEntry[]>(
  entries: E
) {
  // Code-point order, so the hash doesn't depend on the machine's locale.
  const sorted = [...entries].sort((a, b) => (a.name < b.name ? -1 : 1));
  const names = sorted.map((entry) => entry.name);
  const duplicate = names.find((name, i) => names[i + 1] === name);
  if (duplicate !== undefined) {
    throw new Error(`"${duplicate}" is registered twice`);
  }
  // Each step's view of the registry. The spec step's leaves out code-only
  // props, so a UI spec can't give them; the code step's keeps them, listed
  // under codeOnly, so it knows to set them itself.
  const serialize = (step: "spec" | "code") =>
    JSON.stringify(
      sorted.map((entry) => row(entry, step)),
      null,
      2
    );
  const serialized = { spec: serialize("spec"), code: serialize("code") };
  // The registry version in every eval results file's version tuple, over
  // what both steps see. Zod refinements don't serialize, so changing one
  // leaves the hash as it was.
  const hash = createHash("sha256")
    .update(JSON.stringify([serialized.spec, serialized.code]))
    .digest("hex");
  // The wire schema's `component` field: only registered names parse.
  const component = z.enum(names as [E[number]["name"]]);
  // Gate 1 checks each node against its entry.
  return { entries: sorted, serialized, hash, component };
}

// One entry as a step sees it.
function row(entry: RegistryEntry, step: "spec" | "code") {
  const code = step === "code" && entry.codeOnly?.length;
  return {
    name: entry.name,
    use: entry.use,
    props: propsSchema(step === "spec" ? specProps(entry) : entry.props),
    ...(code ? { codeOnly: entry.codeOnly } : {}),
    slots: entry.slots ?? {},
  };
}

// The output schema, the one PropsOf infers, so a defaulted prop is required
// in the prompt as it is in the component's props type.
function propsSchema(props: z.ZodObject) {
  const schema = z.toJSONSchema(props);
  // The same dialect line in every entry is only noise in the prompt.
  delete schema.$schema;
  return schema;
}
