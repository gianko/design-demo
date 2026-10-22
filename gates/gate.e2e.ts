// The acceptance criteria of `pnpm gate` (spec § Gate harness), run end to end
// against the fixture stories in gates/fixtures. Baselines live in a scratch
// directory, so the committed ones are never touched.

import { spawnSync } from "node:child_process";
import { cpSync, existsSync, readFileSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { densities, themes } from "../.storybook/globals.ts";

const repo = resolve(import.meta.dirname, "..");
const baselines = join(repo, "gates/out/e2e-baselines");

const combinations = themes.flatMap((theme) =>
  densities.map((density) => ({
    title: `${theme} · ${density}`,
    file: `${theme}-${density}`,
  }))
);

const baseline = (story: string, file: string) =>
  join(baselines, `${story}--${file}.png`);

type Outcome = { status: string; errors: string[] };

// Runs `pnpm gate` with the fixture stories built in, and returns its printed
// output and each render's outcome, keyed "<story-id> › <theme> · <density>".
function gate(args: string[], { ci }: { ci: boolean }) {
  const { status, stdout, stderr } = spawnSync("pnpm", ["gate", ...args], {
    cwd: repo,
    encoding: "utf8",
    env: {
      ...process.env,
      CI: ci ? "1" : "",
      GATE_FIXTURES: "1",
      GATE_BASELINES: "gates/out/e2e-baselines",
    },
  });
  const report = JSON.parse(
    readFileSync(join(repo, "gates/out/results.json"), "utf8")
  );
  const renders = new Map<string, Outcome>();
  for (const file of report.suites) {
    for (const story of file.suites ?? []) {
      for (const spec of story.specs) {
        const result = spec.tests[0].results.at(-1);
        renders.set(`${story.title} › ${spec.title}`, {
          status: result.status,
          errors: result.errors.map(
            (error: { message: string }) => error.message
          ),
        });
      }
    }
  }
  return { status, output: stdout + stderr, renders };
}

// Starts from the committed baselines, lets a local run write the fixtures'
// missing ones (as a build session would), then makes OnePixel/After's
// baselines one pixel off its render by replacing them with Before's.
function seed(args: string[]) {
  rmSync(baselines, { recursive: true, force: true });
  cpSync(join(repo, "gates/baselines"), baselines, { recursive: true });
  gate(args, { ci: false });
  for (const { file } of combinations) {
    cpSync(
      baseline("gatefixtures-onepixel--before", file),
      baseline("gatefixtures-onepixel--after", file)
    );
  }
}

describe("in CI", () => {
  const missing = baseline("gatefixtures-onepixel--before", "light-admin");
  let run: ReturnType<typeof gate>;

  beforeAll(() => {
    seed([]);
    // A story nobody approved.
    rmSync(missing);
    run = gate([], { ci: true });
  });

  it("passes the placeholder story against its committed baselines", () => {
    for (const { title } of combinations) {
      expect(
        run.renders.get(`placeholder--placeholder › ${title}`)?.status
      ).toBe("passed");
    }
  });

  it("fails a planted axe violation, naming the story, theme and density", () => {
    expect(run.status).not.toBe(0);
    for (const { title } of combinations) {
      const render = `gatefixtures-axeviolation--violation › ${title}`;
      expect(run.output).toMatch(new RegExp(`✘.*${render}`));
      expect(run.renders.get(render)?.errors.join("\n")).toMatch(
        /gate 4: axe[\s\S]*aria-required-attr/
      );
    }
  });

  it("fails a one-pixel change, naming the story, theme and density", () => {
    for (const { title } of combinations) {
      const render = `gatefixtures-onepixel--after › ${title}`;
      expect(run.output).toMatch(new RegExp(`✘.*${render}`));
      expect(run.renders.get(render)?.errors.join("\n")).toMatch(
        /gate 6: baseline[\s\S]*\b1 pixels\b/
      );
    }
  });

  it("fails a missing baseline instead of writing it", () => {
    const render = "gatefixtures-onepixel--before › light · admin";
    expect(run.output).toMatch(new RegExp(`✘.*${render}`));
    expect(run.renders.get(render)?.errors.join("\n")).toMatch(
      /gate 6: baseline[\s\S]*A snapshot doesn't exist/
    );
    expect(existsSync(missing)).toBe(false);
  });
});

describe("locally", () => {
  const after = baseline("gatefixtures-onepixel--after", "light-admin");
  const before = baseline("gatefixtures-onepixel--before", "light-admin");

  beforeAll(() => {
    seed(["OnePixel"]);
  });

  it("leaves a baseline that differs alone without --update", () => {
    const run = gate(["OnePixel"], { ci: false });

    expect(run.status).not.toBe(0);
    expect(readFileSync(after)).toEqual(readFileSync(before));
  });

  it("rewrites a baseline that differs with --update", () => {
    const run = gate(["OnePixel", "--update"], { ci: false });

    expect(run.status).toBe(0);
    expect(readFileSync(after)).not.toEqual(readFileSync(before));
  });
});
