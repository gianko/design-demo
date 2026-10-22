// The acceptance criteria of `pnpm gate` (spec § Gate harness), run end to end
// against the fixture stories in gates/fixtures. Baselines live in a scratch
// directory, so the committed ones are never touched.

import { spawnSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { join, resolve } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { renderTitle, renders, shotName, type Render } from "./stories.ts";

const repo = resolve(import.meta.dirname, "..");
const baselines = join(repo, "gates/out/e2e-baselines");
const contactSheet = join(repo, "gates/out/contact-sheet");

// A story's renders in every theme × density.
const rendersOf = (id: string) => renders([{ id, tags: [] }]);

const baseline = (render: Render) => join(baselines, `${shotName(render)}.png`);

type Outcome = { status: string; errors: string[] };

type Run = ReturnType<typeof gate>;

// Runs `pnpm gate` with the fixture stories built in, and returns its printed
// output, each render's outcome and the contact sheet's shots.
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
  const outcomes = new Map<string, Outcome>();
  for (const file of report.suites) {
    for (const story of file.suites ?? []) {
      for (const spec of story.specs) {
        const result = spec.tests[0].results.at(-1);
        outcomes.set(`${story.title} › ${spec.title}`, {
          status: result.status,
          errors: result.errors.map(
            (error: { message: string }) => error.message
          ),
        });
      }
    }
  }
  const shots = new Map(
    readdirSync(contactSheet)
      .filter((file) => file.endsWith(".png"))
      .map((file) => [file, readFileSync(join(contactSheet, file))])
  );
  return {
    status,
    output: stdout + stderr,
    outcome: (render: Render) =>
      outcomes.get(`${render.id} › ${renderTitle(render)}`),
    shot: (render: Render, name: string) =>
      shots.get(`${shotName(render)}--${name}.png`),
  };
}

// The render failed, its line in the printed output names its story, theme
// and density, and its errors match.
function expectFailed(run: Run, render: Render, errors: RegExp) {
  expect(run.output).toMatch(
    new RegExp(`✘.*${render.id} › ${renderTitle(render)}`)
  );
  expect(run.outcome(render)?.errors.join("\n")).toMatch(errors);
}

// Starts from the committed baselines, lets a local run write the fixtures'
// missing ones (as a build session would), then makes OnePixel/After's and
// OnePixel/Faint's baselines one pixel off their renders by replacing them
// with Before's.
function seed(args: string[]) {
  rmSync(baselines, { recursive: true, force: true });
  cpSync(join(repo, "gates/baselines"), baselines, { recursive: true });
  gate(args, { ci: false });
  const before = rendersOf("gatefixtures-onepixel--before");
  for (const story of ["after", "faint"]) {
    rendersOf(`gatefixtures-onepixel--${story}`).forEach((render, i) =>
      cpSync(baseline(before[i]!), baseline(render))
    );
  }
}

describe("token lint", () => {
  // Planted in src/ for this test only, and removed after it.
  const story = join(repo, "src/gate-raw-value.stories.tsx");

  afterAll(() => rmSync(story, { force: true }));

  it("fails a story that uses a raw value, naming the rule", () => {
    writeFileSync(
      story,
      `export default { title: "GateFixtures/RawValue" };
export const RawValue = { render: () => <p className="bg-[#fff]">Raw</p> };
`
    );

    const { status, stdout, stderr } = spawnSync("pnpm", ["gate"], {
      cwd: repo,
      encoding: "utf8",
    });

    expect(status).not.toBe(0);
    expect(stdout + stderr).toMatch(
      /gate-raw-value\.stories\.tsx[\s\S]*'\[#fff\]'[\s\S]*better-tailwindcss\/no-restricted-classes/
    );
  });
});

describe("in CI", () => {
  // A story nobody approved.
  const [missing] = rendersOf("gatefixtures-onepixel--before");
  let run: Run;

  beforeAll(() => {
    seed([]);
    rmSync(baseline(missing!));
    run = gate([], { ci: true });
  });

  it("passes the placeholder story against its committed baselines", () => {
    for (const render of rendersOf("placeholder--placeholder")) {
      expect(run.outcome(render)?.status).toBe("passed");
    }
  });

  it("fails a planted axe violation, naming the story, theme and density", () => {
    expect(run.status).not.toBe(0);
    for (const render of rendersOf("gatefixtures-axeviolation--violation")) {
      expectFailed(run, render, /gate 4: axe[\s\S]*aria-required-attr/);
    }
  });

  it("fails a one-pixel change, naming the story, theme and density", () => {
    for (const render of rendersOf("gatefixtures-onepixel--after")) {
      expectFailed(run, render, /gate 6: baseline[\s\S]*\b1 pixels\b/);
    }
  });

  it("fails a one-pixel change in the faintest colour", () => {
    for (const render of rendersOf("gatefixtures-onepixel--faint")) {
      expectFailed(run, render, /gate 6: baseline[\s\S]*\b1 pixels\b/);
    }
  });

  it("fails a script error, naming the story, theme and density", () => {
    for (const render of rendersOf("gatefixtures-scripterror--page-error")) {
      expectFailed(run, render, /script-error[\s\S]*planted page error/);
    }
    for (const render of rendersOf("gatefixtures-scripterror--console-error")) {
      expectFailed(run, render, /script-error[\s\S]*planted console error/);
    }
  });

  it("shoots an idle animation midway without freezing the control's transitions", () => {
    const instant = rendersOf("gatefixtures-idleanimation--instant");
    rendersOf("gatefixtures-idleanimation--eased").forEach((eased, i) => {
      const shot = run.shot(eased, "mid-animation");
      expect(shot).toBeDefined();
      expect(shot).toEqual(run.shot(instant[i]!, "mid-animation"));
    });
  });

  // The P0 render-time taste rules (lint/taste/RULES.md): each failing
  // fixture fails gate 7 under the rule's id, with the finding.
  it.each([
    [
      "no-pill",
      "nopill--fail",
      /"Paid" has a \d+px corner radius on a \d+px-high box/,
    ],
    ["type-on-scale", "typeonscale--fail", /"Contractor" is set in weight 700/],
    [
      "type-on-scale",
      "typeonscale--fail",
      /"yesterday" is set at \d+(\.\d+)?px/,
    ],
    [
      "tabular-numerals",
      "tabularnumerals--fail",
      /"4,800\.00" lacks tabular-nums/,
    ],
    [
      "tabular-numerals",
      "tabularnumerals--fail",
      /"1,250\.00 EUR" is not end-aligned in its cell/,
    ],
    [
      "text-overflow",
      "textoverflow--spill",
      /"DE89370400440532013000" spills out of its box/,
    ],
    [
      "text-overflow",
      "textoverflow--spill",
      /"Approve and pay all overdue invoices" spills out of its box/,
    ],
    [
      "text-overflow",
      "textoverflow--clip",
      /"Northwind Logistics GmbH" is clipped without an ellipsis/,
    ],
    [
      "text-overflow",
      "textoverflow--collide",
      /"Awaiting" collides with "Paid"/,
    ],
  ])("fails gate 7's %s on its failing fixture %s", (rule, story, finding) => {
    // The report prints each finding as a JSON string, quotes escaped.
    const printed = finding.source.replaceAll('"', '\\\\?"');
    for (const render of rendersOf(`gatefixtures-${story}`)) {
      expectFailed(
        run,
        render,
        new RegExp(`gate 7: ${rule}\\b[\\s\\S]*${printed}`)
      );
    }
  });

  it.each(["nopill", "typeonscale", "tabularnumerals", "textoverflow"])(
    "passes the %s fixture that follows its taste rule",
    (fixture) => {
      for (const render of rendersOf(`gatefixtures-${fixture}--pass`)) {
        expect(run.outcome(render)).toEqual({ status: "passed", errors: [] });
      }
    }
  );

  it("fails a missing baseline instead of writing it", () => {
    expectFailed(
      run,
      missing!,
      /gate 6: baseline[\s\S]*A snapshot doesn't exist/
    );
    expect(existsSync(baseline(missing!))).toBe(false);
  });
});

// The static taste rules run in the gate's ESLint step, which stops the gate
// before the Playwright pass. Their planted violations are linted only when
// GATE_LINT_FIXTURES asks.
describe("static taste rules", () => {
  let output: string;
  let status: number | null;

  beforeAll(() => {
    ({ status, stdout: output } = spawnSync("pnpm", ["gate"], {
      cwd: repo,
      encoding: "utf8",
      env: { ...process.env, GATE_LINT_FIXTURES: "1" },
    }));
  });

  it.each([
    ["no-pill", "no-pill.fail.tsx"],
    ["no-pill", "no-pill.fail.css"],
    ["motion-tokens", "motion-tokens.fail.tsx"],
    ["motion-tokens", "motion-tokens.fail.css"],
  ])("fails taste/%s on %s", (rule, file) => {
    expect(status).not.toBe(0);
    const report = output
      .split(/\n(?=\/)/)
      .find((block) =>
        block.startsWith(join(repo, "lint/taste/fixtures", file))
      );
    expect(report).toMatch(new RegExp(`error .* taste/${rule}\\n`));
  });

  it("passes the fixtures that follow them", () => {
    expect(output).not.toMatch(/\.pass\.(tsx|css)|Avatar\.tsx/);
  });
});

describe("locally", () => {
  const [after] = rendersOf("gatefixtures-onepixel--after");
  const [before] = rendersOf("gatefixtures-onepixel--before");

  beforeAll(() => {
    seed(["OnePixel"]);
  });

  it("leaves a baseline that differs alone without --update", () => {
    const run = gate(["OnePixel"], { ci: false });

    expect(run.status).not.toBe(0);
    expect(readFileSync(baseline(after!))).toEqual(
      readFileSync(baseline(before!))
    );
  });

  it("rewrites a baseline that differs with --update", () => {
    const run = gate(["OnePixel", "--update"], { ci: false });

    expect(run.status).toBe(0);
    expect(readFileSync(baseline(after!))).not.toEqual(
      readFileSync(baseline(before!))
    );
  });
});
