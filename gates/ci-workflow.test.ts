// The CI workflow's required check (ADR 0009), read from
// .github/workflows/ci.yml: `gate` passes only if every job it needs did. Its
// verdict step's script runs here as the workflow writes it.

import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, it } from "vitest";
import { parse } from "yaml";
import { repo } from "../repo.ts";

type Job = {
  needs?: string | string[];
  if?: string;
  steps: { name?: string; if?: string; run?: string }[];
};
const { jobs } = parse(
  readFileSync(join(repo, ".github/workflows/ci.yml"), "utf8")
) as { jobs: Record<string, Job> };
const gate = jobs.gate!;
const verdict = gate.steps[0]!;

const passes = (env: Record<string, string>) =>
  spawnSync("bash", ["-e", "-c", verdict.run!], {
    env: { PATH: process.env.PATH, ...env },
  }).status === 0;

it("waits for every other job but the deploy", () => {
  expect([gate.needs].flat().toSorted()).toEqual(
    Object.keys(jobs)
      .filter((name) => name !== "gate" && name !== "pages")
      .toSorted()
  );
});

it("always runs, since a skipped required check counts as passed", () => {
  expect(gate.if).toMatch(/always\(\)/);
  expect(verdict.if).toBeUndefined();
});

it("passes when every job passed", () => {
  expect(passes({ RESULTS: "success success success" })).toBe(true);
});

it.each(["failure", "cancelled", "skipped"])(
  "fails when a job ended as %s",
  (result) => {
    expect(passes({ RESULTS: `success ${result} success` })).toBe(false);
    expect(passes({ RESULTS: `${result} success success` })).toBe(false);
    expect(passes({ RESULTS: `success success ${result}` })).toBe(false);
  }
);
