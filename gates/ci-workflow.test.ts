// The CI workflow's required check (ADR 0009), read from
// .github/workflows/ci.yml: `gate` passes only if every job it needs did, or
// the renders weren't needed. Its verdict step's script runs here as the
// workflow writes it.

import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, it } from "vitest";
import { parse } from "yaml";
import { repo } from "../repo.ts";

type Job = {
  needs?: string | string[];
  if?: string;
  outputs?: Record<string, string>;
  steps: { id?: string; name?: string; if?: string; run?: string }[];
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

const passed = {
  STATIC: "success",
  STORYBOOK: "success",
  RENDER: "success",
  RENDER_NEEDED: "true",
};

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
  expect(passes(passed)).toBe(true);
});

it.each(["failure", "cancelled", "skipped"])(
  "fails when a job ended as %s",
  (result) => {
    for (const job of ["STATIC", "STORYBOOK", "RENDER"]) {
      expect(passes({ ...passed, [job]: result }), job).toBe(false);
    }
  }
);

it("passes with the renders skipped only when they weren't needed", () => {
  const skipped = { ...passed, RENDER: "skipped" };
  expect(passes({ ...skipped, RENDER_NEEDED: "false" })).toBe(true);
  // A storybook job that failed before deciding leaves no output.
  expect(passes({ ...skipped, RENDER_NEEDED: "" })).toBe(false);
  expect(
    passes({ ...skipped, RENDER_NEEDED: "false", STATIC: "failure" })
  ).toBe(false);
});

it("renders unless the builds were compared and match", () => {
  const { storybook, render } = jobs;
  expect(storybook!.outputs?.render).toBe(
    "${{ steps.builds.outputs.needed != 'false' }}"
  );
  expect(render!.if).toBe("${{ needs.storybook.outputs.render == 'true' }}");
  // Only a PR compares, so every push to main renders.
  const step = (id: string) =>
    storybook!.steps.find((candidate) => candidate.id === id);
  expect(step("paths")!.if).toBe("${{ github.event_name == 'pull_request' }}");
  expect(step("builds")!.if).toBe(
    "${{ steps.paths.outputs.needed == 'false' }}"
  );
});
