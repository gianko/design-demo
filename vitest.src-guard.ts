// Vitest global setup: unit tests write to temp dirs, never into src/. A test
// that writes there, even one that cleans up after itself, races every test
// that lists src/ from another worker (`keep.test.ts` against the calibration
// set in #332). This watches src/ for the whole run and fails it, naming each
// path written. The gate suites (`pnpm test:gate`) render real stories from
// src/ and run under their own config, without this guard.

import { type FSWatcher, watch } from "node:fs";
import { join } from "node:path";
import { repo } from "./repo.ts";

export default function setup() {
  const written = new Set<string>();
  const watcher: FSWatcher = watch(
    join(repo, "src"),
    { recursive: true },
    (_event, file) => {
      if (file) written.add(join("src", file));
    }
  );
  return () => {
    watcher.close();
    if (written.size)
      throw new Error(
        `A unit test wrote into src/, which other tests read from in parallel. Write to a temp dir instead:\n${[...written].sort().join("\n")}`
      );
  };
}
