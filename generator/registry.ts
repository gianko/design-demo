// The library's registry: every `src/components/<Name>/<Name>.registry.ts`
// entry, found on disk so a new component joins without a list to update.
// Entries import their component's tv() config, so this runs under tsx or
// Vitest, which load .tsx, rather than plain node.

import { readdirSync } from "node:fs";
import { resolve } from "node:path";
import type { RegistryEntry } from "../src/registry/entry.ts";
import { defineRegistry } from "../src/registry/registry.ts";

const components = resolve(import.meta.dirname, "../src/components");

export type LibraryRegistry = ReturnType<typeof defineRegistry>;

export async function loadRegistry(): Promise<LibraryRegistry> {
  const entries: RegistryEntry[] = [];
  for (const name of readdirSync(components).sort()) {
    const file = resolve(components, name, `${name}.registry.ts`);
    const module: Record<string, unknown> = await import(file);
    const found = Object.values(module).filter(isEntry);
    if (found.length !== 1) {
      throw new Error(
        `${file}: expected one registry entry, found ${found.length}`
      );
    }
    entries.push(found[0]!);
  }
  return defineRegistry(entries);
}

function isEntry(value: unknown): value is RegistryEntry {
  return (
    typeof value === "object" &&
    value !== null &&
    "name" in value &&
    "use" in value &&
    "props" in value
  );
}
