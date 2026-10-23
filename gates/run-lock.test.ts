import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { acquireRunLock } from "./run-lock.ts";

const lockIn = () => join(mkdtempSync(join(tmpdir(), "run-lock-")), "x.lock");

describe("acquireRunLock", () => {
  it("takes a free lock, and its release frees it", () => {
    const lock = lockIn();
    const release = acquireRunLock(lock);
    expect(readFileSync(lock, "utf8")).toBe(String(process.pid));
    release();
    expect(existsSync(lock)).toBe(false);
  });

  it("refuses a lock a running process holds, naming it", () => {
    const lock = lockIn();
    acquireRunLock(lock);
    expect(() => acquireRunLock(lock)).toThrow(`pid ${process.pid}`);
  });

  it("takes over a lock whose process has exited", () => {
    const lock = lockIn();
    const { pid } = spawnSync(process.execPath, ["-e", ""]);
    writeFileSync(lock, String(pid));
    acquireRunLock(lock);
    expect(readFileSync(lock, "utf8")).toBe(String(process.pid));
  });
});
