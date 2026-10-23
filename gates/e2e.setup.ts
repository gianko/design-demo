// `pnpm test:gate` holds the checkout's run lock for the whole run, and its
// release is the teardown.

import { resolve } from "node:path";
import { acquireRunLock } from "./run-lock.ts";

export default function setup() {
  try {
    return acquireRunLock(resolve(import.meta.dirname, "out/test-gate.lock"));
  } catch (error) {
    // Vitest 5 crashes printing an error thrown from a global setup (its
    // source-map lookup throws), so the message is printed here instead.
    console.error((error as Error).message);
    process.exit(1);
  }
}
