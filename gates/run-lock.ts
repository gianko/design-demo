// One `pnpm test:gate` per checkout. The suite plants stories and removes and
// restores baselines in the working tree, so a second run in the same
// checkout would see, or undo, the first one's changes. The lock file holds
// its owner's pid; a lock whose process has exited is stale and taken over.

import { mkdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

export function acquireRunLock(path: string): () => void {
  mkdirSync(dirname(path), { recursive: true });
  if (!take(path)) {
    const owner = Number(readFileSync(path, "utf8"));
    if (running(owner)) {
      throw new Error(
        `pnpm test:gate is already running in this checkout (pid ${owner}). ` +
          "Wait for it to finish: both runs plant and remove the same files."
      );
    }
    unlinkSync(path);
    take(path);
  }
  return () => unlinkSync(path);
}

function take(path: string): boolean {
  try {
    writeFileSync(path, String(process.pid), { flag: "wx" });
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "EEXIST") return false;
    throw error;
  }
}

function running(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return (error as NodeJS.ErrnoException).code === "EPERM";
  }
}
