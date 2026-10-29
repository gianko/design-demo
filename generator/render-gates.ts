// The code step's render pass (ADR 0008, ADR 0010): gate 4 (axe) and the
// render-time taste rules (gate 7) over light and dark × the default and
// every declared screen state, at the density the audience sets. The screen
// is built as it would be kept: its stories (./screen-stories.ts) beside it
// in a Storybook build of its own, then the gate's Playwright pass in the
// pinned image (ADR 0009), with no baselines. A screen that doesn't build
// isn't rendered, and both render gates are `not-run`.

import { spawn } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { stripVTControlCharacters } from "node:util";
import type { Density, Theme } from "../.storybook/globals.ts";
import { playwrightInImage } from "../gates/image.ts";
import { annotation, type Checks } from "../gates/stories.ts";
import { renderRules } from "../gates/render-rules.ts";
import type { GateResult } from "./code-gates.ts";
import type { Failure, GateName } from "./failure.ts";
import { screenStories, storyStates } from "./screen-stories.ts";
import type { UiSpec } from "./ui-spec.ts";
import { repo } from "../repo.ts";

export type RenderGateName = Extract<GateName, "gate 4" | "gate 7 render">;

export type Render = {
  theme: Theme;
  density: Density;
  state: string;
  gates: Record<RenderGateName, GateResult>;
};

// One render's rest shot, as the pass took it: the screenshot gate 5 judges
// (generator/conformance.ts).
export type RenderShot = {
  theme: Theme;
  state: string;
  // The PNG, under the attempt's `render/shots/`.
  file: string;
};

export type RenderGates = {
  // Did the screen build? A failed build is a gate 3 failure, `build`.
  built: boolean;
  gates: Record<RenderGateName, GateResult>;
  renders: Render[];
  failures: Failure[];
  // Each render's rest shot that the pass attached; none when it didn't
  // build.
  shots?: RenderShot[];
};

export type RenderInput = {
  // The attempt's folder; the build and its results go in `render/` there.
  dir: string;
  slug: string;
  name: string;
  source: string;
  audience: Density;
  states: UiSpec["states"];
  // What the action-transitions taste rule clicks through.
  nodes: UiSpec["nodes"];
  actions: UiSpec["actions"];
};

// The render pass as generate() takes it, so a test can stand in its own.
export type RenderPass = (input: RenderInput) => Promise<RenderGates>;

const notRun = { "gate 4": "not-run", "gate 7 render": "not-run" } as const;

// A failure line's location quotes at most this much of an element.
const htmlLimit = 200;

export async function renderGates(input: RenderInput): Promise<RenderGates> {
  const render = resolve(input.dir, "render");
  // The screen sits two folders below a barrel shim, so its own import of
  // "../../index.ts" reaches the library as it will once kept.
  const screens = join(render, "screens", input.slug);
  mkdirSync(screens, { recursive: true });
  writeFileSync(
    join(render, "index.ts"),
    `export * from ${JSON.stringify(relative(render, resolve(repo, "src/index.ts")))};\n`
  );
  writeFileSync(join(screens, `${input.name}.tsx`), input.source);
  writeFileSync(
    join(screens, `${input.name}.stories.tsx`),
    screenStories(input)
  );

  const storybook = join(render, "storybook-static");
  const build = await run(
    "pnpm",
    ["exec", "storybook", "build", "--quiet", "--output-dir", storybook],
    {
      GATE_STORIES: `${relative(resolve(repo, ".storybook"), screens)}/*.stories.tsx`,
    }
  );
  writeFileSync(join(render, "build.log"), build.output);
  if (build.status !== 0) {
    return {
      built: false,
      gates: notRun,
      renders: [],
      failures: [
        {
          gate: "gate 3",
          rule: "build",
          location: "(build)",
          message: buildError(build.output),
        },
      ],
    };
  }

  const out = join(render, "out");
  const pass = await run(
    "docker",
    playwrightInImage(
      relative(repo, resolve(import.meta.dirname, "render.config.ts")),
      [],
      {
        GATE_STORYBOOK: relative(repo, storybook),
        GATE_OUT: relative(repo, out),
        GATE_DENSITIES: input.audience,
        GATE_RENDER_ONLY: "1",
      }
    ),
    {}
  );
  writeFileSync(join(render, "playwright.log"), pass.output);
  const resultsFile = join(out, "results.json");
  if (!existsSync(resultsFile)) {
    throw new Error(
      `The render pass wrote no results (exit ${pass.status}):\n${pass.output.slice(-2000)}`
    );
  }
  return readResults(
    JSON.parse(readFileSync(resultsFile, "utf8")),
    JSON.parse(readFileSync(join(storybook, "index.json"), "utf8")),
    input
  );
}

type Report = {
  suites: {
    suites?: {
      title: string;
      specs: {
        title: string;
        tests: {
          results: {
            status: string;
            errors: { message?: string }[];
            attachments: { name: string; body?: string }[];
          }[];
        }[];
      }[];
    }[];
  }[];
};

type StorybookIndex = {
  entries: Record<string, { type: string; id: string; exportName?: string }>;
};

function readResults(
  report: Report,
  index: StorybookIndex,
  input: RenderInput
): RenderGates {
  const stateOf = new Map(
    storyStates(input).map(({ exportName, state }) => [exportName, state])
  );
  const states = new Map(
    Object.values(index.entries)
      .filter((entry) => entry.type === "story")
      .map((entry) => [entry.id, stateOf.get(entry.exportName ?? "")])
  );
  const renders: Render[] = [];
  const failures: Failure[] = [];
  const shots: RenderShot[] = [];
  const shotsDir = join(input.dir, "render", "shots");
  for (const file of report.suites) {
    for (const story of file.suites ?? []) {
      const state = states.get(story.title) ?? story.title;
      for (const spec of story.specs) {
        const [theme, density] = spec.title.split(" · ") as [Theme, Density];
        const where = `${theme} · ${state}`;
        const result = spec.tests[0]!.results.at(-1)!;
        const attachment = result.attachments.find(
          (candidate) => candidate.name === annotation.checks
        );
        const gates: Render["gates"] = { ...notRun };
        if (attachment?.body) {
          const checks: Checks = JSON.parse(
            Buffer.from(attachment.body, "base64").toString("utf8")
          );
          for (const violation of checks.axe) {
            for (const node of violation.nodes) {
              failures.push({
                gate: "gate 4",
                rule: violation.id,
                location: `${node.target} ${trim(node.html)}`,
                message: violation.help,
                help: violation.help,
                renders: [where],
              });
            }
          }
          gates["gate 4"] = checks.axe.length ? "fail" : "pass";
          // One line per rule and element: a rule's findings on one element
          // join into one message.
          const taste = renderRules.flatMap((rule) => {
            const byElement = new Map<string, string[]>();
            for (const { selector, html, message } of checks.taste[rule.name] ??
              []) {
              const location = `${selector} ${trim(html)}`;
              byElement.set(location, [
                ...(byElement.get(location) ?? []),
                message,
              ]);
            }
            return [...byElement].map(([location, messages]) => ({
              gate: "gate 7 render" as const,
              rule: rule.name,
              location,
              message: messages.join(" "),
              help: rule.help,
              renders: [where],
            }));
          });
          failures.push(...taste);
          gates["gate 7 render"] = taste.length ? "fail" : "pass";
        }
        // script-error (lint/taste/RULES.md § Placed elsewhere): a render
        // that throws, logs a console error or never renders. It has no
        // element to point at, so its location is the page.
        const scriptErrors = result.errors
          .map((error) => error.message ?? "")
          .filter((message) => !/gate [47]:/.test(message))
          .map((message) => stripVTControlCharacters(message.split("\n")[0]!));
        if (scriptErrors.length) {
          gates["gate 7 render"] = "fail";
          failures.push(
            ...scriptErrors.map((message) => ({
              gate: "gate 7 render" as const,
              rule: "script-error",
              location: "(page)",
              message,
              renders: [where],
            }))
          );
        }
        renders.push({ theme, density, state, gates });
        // The rest shot, written out under a name made from its render. The
        // pass attaches its bytes, which the JSON report keeps as base64;
        // a path would be the image's, not this machine's.
        const rest = result.attachments.find(({ name }) => name === "rest");
        if (rest?.body) {
          mkdirSync(shotsDir, { recursive: true });
          const shot = join(
            shotsDir,
            `${theme}--${state.replace(/[^a-z0-9]+/gi, "-")}.png`
          );
          writeFileSync(shot, Buffer.from(rest.body, "base64"));
          shots.push({ theme, state, file: shot });
        }
      }
    }
  }
  const overall = (gate: RenderGateName): GateResult =>
    renders.some((render) => render.gates[gate] === "fail")
      ? "fail"
      : renders.every((render) => render.gates[gate] === "pass")
        ? "pass"
        : "not-run";
  return {
    built: true,
    gates: {
      "gate 4": overall("gate 4"),
      "gate 7 render": overall("gate 7 render"),
    },
    renders,
    failures,
    shots,
  };
}

function trim(html: string) {
  const flat = html.replace(/\s+/g, " ");
  return flat.length > htmlLimit ? `${flat.slice(0, htmlLimit - 1)}…` : flat;
}

// The first line that reads as an error, or the output's last line.
function buildError(output: string) {
  const lines = output
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  return (
    lines.find((line) => /error/i.test(line)) ??
    lines.at(-1) ??
    "The build failed."
  );
}

function run(
  command: string,
  args: string[],
  env: Record<string, string>
): Promise<{ status: number | null; output: string }> {
  return new Promise((done, fail) => {
    const child = spawn(command, args, {
      cwd: repo,
      env: { ...process.env, ...env },
    });
    let output = "";
    child.stdout.on("data", (chunk) => (output += chunk));
    child.stderr.on("data", (chunk) => (output += chunk));
    child.on("error", fail);
    child.on("close", (status) => done({ status, output }));
  });
}
