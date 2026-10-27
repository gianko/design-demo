// The acceptance criteria of `pnpm gate` (spec § Gate harness), run end to end
// against the fixture stories in gates/fixtures. Baselines live in a scratch
// directory, so the committed ones are never touched.

import { spawnSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { staticRules } from "../lint/taste/rules/index.ts";
import * as noPill from "../lint/taste/rules/no-pill.ts";
import * as tabularNumerals from "../lint/taste/rules/tabular-numerals.ts";
import * as textOverflow from "../lint/taste/rules/text-overflow.ts";
import * as typeOnScale from "../lint/taste/rules/type-on-scale.ts";
import { renderRules } from "./render-rules.ts";
import { renderTitle, renders, shotName, type Render } from "./stories.ts";
import { repo } from "../repo.ts";

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
  // Only the stories this suite checks, so it doesn't grow with the library.
  const targets = [
    "Placeholder",
    ...readdirSync(join(repo, "gates/fixtures")).map((file) =>
      file
        .replace(/\.stories\.tsx$/, "")
        .replace(/(?:^|-)(\w)/g, (_, letter: string) => letter.toUpperCase())
    ),
  ];
  let run: Run;

  beforeAll(() => {
    seed(targets);
    rmSync(baseline(missing!));
    run = gate(targets, { ci: true });
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

  // Style expectations (ADR 0012). Each fixture's `play` settles only after
  // an async wait.
  it("fails a failing style expectation as gate 8 alone, naming the story, theme and density", () => {
    for (const render of rendersOf("gatefixtures-styleexpectation--fails")) {
      expectFailed(
        run,
        render,
        /gate 8: style expectations[\s\S]*expected '\d+px' to be '13px'/
      );
      // Not script-error, and not a story that failed to render: the other
      // gates ran, and passed.
      expect(run.outcome(render)?.errors).toHaveLength(1);
    }
  });

  it("waits for a style expectation that passes after an async wait", () => {
    for (const render of rendersOf(
      "gatefixtures-styleexpectation--passes-after-wait"
    )) {
      expect(run.outcome(render)).toEqual({ status: "passed", errors: [] });
    }
  });

  it("renders a story tagged phone 360px wide, with baselines named like any other's", () => {
    // Its `play` expects a 360px-wide viewport.
    for (const render of rendersOf("gatefixtures-styleexpectation--phone")) {
      expect(run.outcome(render)).toEqual({ status: "passed", errors: [] });
      expect(existsSync(baseline(render))).toBe(true);
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

  // The P0 render-time taste rules (lint/taste/RULES.md): each rule's
  // failing fixture story fails gate 7 under the rule's id, with the finding.
  // A rule's fixtures are the stories of GateFixtures/<Rule>.
  const fixture = (rule: string, story: string) =>
    `gatefixtures-${rule.replaceAll("-", "")}--${story}`;

  it.each([
    [noPill.id, "fail", /"Paid" has a \d+px corner radius on a \d+px-high box/],
    [typeOnScale.id, "fail", /"Contractor" is set in weight 700/],
    [typeOnScale.id, "fail", /"yesterday" is set at \d+(\.\d+)?px/],
    [tabularNumerals.id, "fail", /"4,800\.00" lacks tabular-nums/],
    [
      tabularNumerals.id,
      "fail",
      /"1,250\.00 EUR" is not end-aligned in its cell/,
    ],
    [
      textOverflow.id,
      "spill",
      /"DE89370400440532013000" spills out of its box/,
    ],
    [
      textOverflow.id,
      "spill",
      /"Approve and pay all overdue invoices" spills out of its box/,
    ],
    [
      textOverflow.id,
      "clip",
      /"Northwind Logistics GmbH" is clipped without an ellipsis/,
    ],
    [textOverflow.id, "collide", /"Awaiting" collides with "Paid"/],
    [
      "no-pure-neutral-text",
      "fail",
      /"Ada Lovelace" is set in rgb\(0, 0, 0\), which has no chroma/,
    ],
    [
      "no-pure-neutral-text",
      "fail",
      /"Approve and pay" is set in rgb\(0, 0, 0\), which has no chroma/,
    ],
    [
      "no-pure-neutral-text",
      "fail",
      /The placeholder "Search invoices" is set in oklab\(0 0 0 \/ 0\.5\)/,
    ],
    [
      "no-pure-neutral-text",
      "fail",
      /"Invoice 1042" is set in rgb\(0, 0, 0\), which has no chroma/,
    ],
  ])("fails gate 7's %s on its failing fixture %s", (rule, story, finding) => {
    // The report prints each finding as a JSON string, quotes escaped.
    const printed = finding.source.replaceAll('"', '\\\\?"');
    for (const render of rendersOf(fixture(rule, story))) {
      expectFailed(
        run,
        render,
        new RegExp(`gate 7: ${rule}\\b[\\s\\S]*${printed}`)
      );
    }
  });

  it.each(renderRules.map((rule) => rule.name))(
    "passes the %s fixture that follows its taste rule",
    (rule) => {
      for (const render of rendersOf(fixture(rule, "pass"))) {
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

// The static taste rules and token lint run in the gate's ESLint step, which
// stops the gate before the Playwright pass. `pnpm lint` ignores their
// fixtures, so this plants copies where it looks, and removes them after.
describe("static lint fixtures", () => {
  const planted = join(repo, "gates/planted-lint-fixtures");
  const tasteFixtures = join(repo, "lint/taste/fixtures");
  let output: string;
  let status: number | null;

  // The gate's ESLint report on one planted file.
  const reportOf = (file: string) =>
    output
      .split(/\n(?=\/)/)
      .find((block) => block.startsWith(join(planted, file)));

  beforeAll(() => {
    rmSync(planted, { recursive: true, force: true });
    mkdirSync(planted);
    // The rules' own fixtures (the Avatar exemption needs a library path, so
    // static.test.ts covers it), and token lint's planted CSS.
    for (const file of readdirSync(tasteFixtures)) {
      if (/\.(?:pass|fail)\.(?:tsx|css)$/.test(file)) {
        cpSync(join(tasteFixtures, file), join(planted, file));
      }
    }
    cpSync(
      join(repo, "lint/token/fixtures/violations.css"),
      join(planted, "violations.css")
    );
    ({ status, stdout: output } = spawnSync("pnpm", ["gate"], {
      cwd: repo,
      encoding: "utf8",
    }));
  });

  afterAll(() => rmSync(planted, { recursive: true, force: true }));

  it.each([
    ...staticRules.flatMap(({ id }) =>
      ["tsx", "css"].map((extension) => [
        `taste/${id}`,
        `${id}.fail.${extension}`,
      ])
    ),
    ["taste-exemptions/no-inline-disable", "no-inline-disable.fail.tsx"],
    ["taste-exemptions/no-inline-disable", "no-inline-disable.fail.css"],
    ["token/no-raw-css-values", "violations.css"],
  ])("fails %s on %s", (rule, file) => {
    expect(status).not.toBe(0);
    expect(reportOf(file)).toMatch(new RegExp(`error .* ${rule}\\n`));
  });

  it("passes the taste fixtures that follow the rules", () => {
    expect(output).not.toMatch(/\.pass\.(tsx|css)/);
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
