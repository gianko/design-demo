// `pnpm eval:report` from hand-written results files (ADR 0008). Each test
// writes its own results files, scratch folders and reports folder, and reads
// the report back as a document.

import { randomUUID } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { join, relative } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import type { Step } from "../generator/config.ts";
import type { Attempt } from "../generator/generate.ts";
import type { GateName } from "../generator/failure.ts";
import { main } from "./report.ts";
import {
  type RepOutcome,
  type RepResult,
  type ResultsFile,
  tally,
} from "./results.ts";
import { repo } from "../repo.ts";

const cleanup: string[] = [];
afterEach(() => {
  for (const path of cleanup.splice(0))
    rmSync(path, { recursive: true, force: true });
});

// A scratch folder for one test: results files, eval-run scratch, reports.
function setup() {
  const dir = join(repo, ".generated", `vitest-report-${randomUUID()}`);
  cleanup.push(dir);
  mkdirSync(dir, { recursive: true });
  return {
    dir,
    resultsDir: join(dir, "results"),
    runsDir: join(dir, "runs"),
    reportsDir: join(dir, "reports"),
  };
}
type At = ReturnType<typeof setup>;

const codeGates: GateName[] = [
  "gate 2",
  "gate 3",
  "gate 7 static",
  "gate 4",
  "gate 7 render",
];

// One attempt, $0.10, failing the gates it names.
function attempt(step: Step, n: number, ...failing: GateName[]): Attempt {
  const names: GateName[] = step === "spec" ? ["gate 1"] : codeGates;
  return {
    step,
    attempt: n,
    gates: Object.fromEntries(
      names.map((gate) => [gate, failing.includes(gate) ? "fail" : "pass"])
    ),
    failures: failing.map(
      (gate) => `${gate} · some-rule · <div class="x"> · It broke.`
    ),
    usage: { input: 1000, output: 500, cacheRead: 0, cacheWrite: 0 },
    cost: 0.1,
    stopReason: "end_turn",
    requestId: `req_${step}_${n}`,
    wallMs: { model: 1000, gates: 200 },
    promptHash: "p".repeat(64),
    renders:
      step === "code"
        ? [
            {
              theme: "light",
              density: "admin",
              state: "default",
              gates: { "gate 4": "pass", "gate 7 render": "pass" },
            },
            {
              theme: "dark",
              density: "admin",
              state: "rows-selected",
              gates: { "gate 4": "pass", "gate 7 render": "pass" },
            },
          ]
        : undefined,
  };
}

const ok = { met: true, missing: [] };

function rep(
  runId: string,
  brief: string,
  n: number,
  outcome: RepOutcome,
  wallSeconds: number,
  attempts: Attempt[],
  at: At
): RepResult {
  return {
    brief,
    rep: n,
    outcome,
    endReason:
      outcome === "pass"
        ? "passed"
        : outcome === "fail"
          ? "code-attempts-exhausted"
          : outcome === "error"
            ? "error:api"
            : "skipped:budget",
    firstAttempt:
      outcome === "pass" && attempts.every((each) => each.attempt === 1),
    criteria: outcome === "skipped" ? null : ok,
    cost: attempts.length * 0.1,
    wallMs: wallSeconds * 1000,
    workDir:
      outcome === "skipped"
        ? null
        : relative(repo, join(at.runsDir, runId, `${brief}-${n}`)),
    attempts,
  };
}

// The run every test starts from, K = 3:
// - invoice-queue passes first time, passes after a code repair, and fails
//   with its code attempts exhausted: 1/3 → 2/3.
// - payment-status passes first time twice, and once after a spec repair:
//   2/3 → 3/3.
function runA(at: At, briefSlugs = ["invoice-queue", "payment-status"]) {
  const runId = "20261026-140509-before";
  const reps = [
    rep(
      runId,
      "invoice-queue",
      1,
      "pass",
      50,
      [attempt("spec", 1), attempt("code", 1)],
      at
    ),
    rep(
      runId,
      "payment-status",
      1,
      "pass",
      40,
      [attempt("spec", 1), attempt("code", 1)],
      at
    ),
    rep(
      runId,
      "invoice-queue",
      2,
      "pass",
      70,
      [attempt("spec", 1), attempt("code", 1, "gate 3"), attempt("code", 2)],
      at
    ),
    rep(
      runId,
      "payment-status",
      2,
      "pass",
      40,
      [attempt("spec", 1), attempt("code", 1)],
      at
    ),
    rep(
      runId,
      "invoice-queue",
      3,
      "fail",
      90,
      [
        attempt("spec", 1),
        attempt("code", 1, "gate 4"),
        attempt("code", 2, "gate 4", "gate 7 render"),
        attempt("code", 3, "gate 3"),
      ],
      at
    ),
    rep(
      runId,
      "payment-status",
      3,
      "pass",
      60,
      [attempt("spec", 1, "gate 1"), attempt("spec", 2), attempt("code", 1)],
      at
    ),
  ].filter((each) => briefSlugs.includes(each.brief));
  return results(runId, "before", briefSlugs, reps);
}

// A later run where every rep of every brief passes first time.
function runB(at: At, briefSlugs = ["invoice-queue", "payment-status"]) {
  const runId = "20261027-090000-after";
  const reps = [1, 2, 3].flatMap((n) =>
    briefSlugs.map((brief) =>
      rep(
        runId,
        brief,
        n,
        "pass",
        30,
        [attempt("spec", 1), attempt("code", 1)],
        at
      )
    )
  );
  return {
    ...results(runId, "after", briefSlugs, reps),
    startedAt: "2026-10-27T08:00:00.000Z",
  };
}

function results(
  runId: string,
  label: string,
  briefSlugs: string[],
  reps: RepResult[]
): ResultsFile {
  return {
    runId,
    startedAt: "2026-10-26T13:05:09.000Z",
    finishedAt: "2026-10-26T13:09:00.000Z",
    versions: {
      registryHash: "r".repeat(64),
      specPromptHash: "s".repeat(64),
      codePromptHash: "c".repeat(64),
      spec: {
        model: "claude-opus-5-5",
        effort: "high",
        maxTokens: 16000,
        attempts: 3,
      },
      code: {
        model: "claude-opus-5-5",
        effort: "high",
        maxTokens: 32000,
        attempts: 3,
      },
      gitSha: "a".repeat(40),
      dirty: false,
      label,
    },
    briefs: "evals/briefs/*.md",
    k: 3,
    budget: 15,
    concurrency: 3,
    briefSlugs,
    totals: tally(reps),
    perBrief: Object.fromEntries(
      briefSlugs.map((slug) => [
        slug,
        tally(reps.filter((each) => each.brief === slug)),
      ])
    ),
    reps,
  };
}

function write(at: At, name: string, file: ResultsFile) {
  mkdirSync(at.resultsDir, { recursive: true });
  const path = join(at.resultsDir, name);
  writeFileSync(path, JSON.stringify(file, null, 2));
  return relative(repo, path);
}

// A stand-in PNG whose bytes say which render it is.
const png = (label: string) => Buffer.from(`png ${label}`).toString("base64");

// One rep's scratch folder as generate() leaves it: per code attempt, the
// render pass's Storybook index and Playwright results, each render's
// screenshot attached as `rest` (gates/stories.spec.ts).
function scratch(at: At, workDir: string, codeAttempts: number[]) {
  const dir = join(repo, workDir);
  mkdirSync(join(dir, "attempt-1-spec"), { recursive: true });
  writeFileSync(join(dir, "attempt-1-spec", "ui-spec.json"), "{}");
  for (const n of codeAttempts) {
    const render = join(dir, `attempt-${n}-code`, "render");
    const stories = {
      "screens-invoice-queue--default": "Default",
      "screens-invoice-queue--rows-selected": "RowsSelected",
    };
    mkdirSync(join(render, "storybook-static"), { recursive: true });
    writeFileSync(
      join(render, "storybook-static", "index.json"),
      JSON.stringify({
        v: 5,
        entries: Object.fromEntries(
          Object.entries(stories).map(([id, exportName]) => [
            id,
            { type: "story", id, exportName },
          ])
        ),
      })
    );
    mkdirSync(join(render, "out"), { recursive: true });
    writeFileSync(
      join(render, "out", "results.json"),
      JSON.stringify({
        suites: [
          {
            title: "stories.spec.ts",
            suites: Object.keys(stories).map((id) => ({
              title: id,
              specs: ["light", "dark"].map((theme) => ({
                title: `${theme} · admin`,
                tests: [
                  {
                    results: [
                      {
                        status: "passed",
                        errors: [],
                        attachments: [
                          {
                            name: "checks",
                            contentType: "application/json",
                            body: Buffer.from("{}").toString("base64"),
                          },
                          {
                            name: "rest",
                            contentType: "image/png",
                            body: png(`${n} ${theme} ${id}`),
                          },
                        ],
                      },
                    ],
                  },
                ],
              })),
            })),
          },
        ],
      })
    );
  }
}

function figures(doc: Document) {
  return [...doc.querySelectorAll("figure")].map((figure) => ({
    src: figure.querySelector("img")?.getAttribute("src"),
    caption: figure.querySelector("figcaption")?.textContent?.trim(),
  }));
}

async function report(at: At, argv: string[]) {
  const lines: string[] = [];
  const code = await main(argv, {
    log: (line) => lines.push(line),
    reportsDir: at.reportsDir,
    resultsDir: at.resultsDir,
  });
  return { code, output: lines.join("\n") };
}

// The one report the call wrote, as text and as a document.
function written(at: At) {
  const files = readdirSync(at.reportsDir);
  expect(files).toHaveLength(1);
  const html = readFileSync(join(at.reportsDir, files[0]!), "utf8");
  return {
    name: files[0]!,
    html,
    doc: new DOMParser().parseFromString(html, "text/html"),
  };
}

// The summary table's rows for one screen brief ("All briefs" for the
// overall row), each keyed by its column heading.
function rows(doc: Document, brief: string) {
  const table = doc.querySelector("table.summary")!;
  const headings = [...table.querySelectorAll("thead th")].map(
    (th) => th.textContent?.trim() ?? ""
  );
  return [...table.querySelectorAll("tbody tr")]
    .map((tr) =>
      Object.fromEntries(
        [...tr.querySelectorAll("th, td")].map((cell, i) => [
          headings[i],
          cell.textContent?.trim().replace(/\s+/g, " "),
        ])
      )
    )
    .filter((row) => row["Screen brief"] === brief);
}

describe("pnpm eval:report", () => {
  it("turns one results file into a run report: one HTML file, styled by tokens.css, that references nothing outside itself", async () => {
    const at = setup();
    const a = write(at, "2026-10-26-before.json", runA(at));

    const { code } = await report(at, [a]);

    expect(code).toBe(0);
    const { name, html, doc } = written(at);
    expect(name).toBe("2026-10-26-before.html");
    expect(doc.querySelector("h1")?.textContent).toMatch(/run report/i);
    // The design system's own tokens, inline.
    const tokens = readFileSync(join(repo, "tokens", "tokens.css"), "utf8");
    expect(html).toContain(tokens.slice(tokens.indexOf(":root {")));
    expect(html).toMatch(/var\(--ds-color-bg-page\)/);
    // Nothing outside: no stylesheet or script links, no imports, and every
    // src, href and url() is inline data or a fragment.
    expect(doc.querySelectorAll("link, script[src]")).toHaveLength(0);
    expect(html).not.toMatch(/@import/);
    expect(html).not.toMatch(/\b(?:src|href)\s*=\s*"(?!data:|#)/);
    expect(html).not.toMatch(/url\(\s*["']?(?!data:)/);
  });

  it("counts passes as first attempt → final per screen brief and overall, beside mean attempts, cost, wall time and per-gate failure counts", async () => {
    const at = setup();
    const a = write(at, "2026-10-26-before.json", runA(at));

    await report(at, [a]);

    const { doc } = written(at);
    expect(rows(doc, "invoice-queue")).toEqual([
      {
        "Screen brief": "invoice-queue",
        "Passed (first attempt → final)": "1/3 → 2/3",
        Errors: "0",
        Skipped: "0",
        "Mean attempts (spec · code)": "1.0 · 2.0",
        Cost: "$0.90",
        "Wall time": "3m 30s",
        "gate 1": "0",
        "gate 2": "0",
        "gate 3": "2",
        "gate 7 static": "0",
        "gate 4": "2",
        "gate 7 render": "1",
      },
    ]);
    expect(rows(doc, "payment-status")).toEqual([
      expect.objectContaining({
        "Passed (first attempt → final)": "2/3 → 3/3",
        "Mean attempts (spec · code)": "1.3 · 1.0",
        Cost: "$0.70",
        "Wall time": "2m 20s",
        "gate 1": "1",
        "gate 3": "0",
      }),
    ]);
    expect(rows(doc, "All briefs")).toEqual([
      expect.objectContaining({
        "Passed (first attempt → final)": "3/6 → 5/6",
        "Mean attempts (spec · code)": "1.2 · 1.5",
        Cost: "$1.60",
        "Wall time": "5m 50s",
        "gate 1": "1",
        "gate 3": "2",
        "gate 4": "2",
        "gate 7 render": "1",
      }),
    ]);
  });

  it("turns two results files into a comparison, the runs side by side per screen brief and overall", async () => {
    const at = setup();
    const a = write(at, "2026-10-26-before.json", runA(at));
    const b = write(at, "2026-10-27-after.json", runB(at));

    const { code } = await report(at, [a, b]);

    expect(code).toBe(0);
    const { name, doc } = written(at);
    expect(name).toBe("2026-10-26-before-vs-2026-10-27-after.html");
    expect(doc.querySelector("h1")?.textContent).toMatch(/comparison/i);
    const passed = (brief: string) =>
      rows(doc, brief).map((row) => [
        row["Run"],
        row["Passed (first attempt → final)"],
      ]);
    expect(passed("invoice-queue")).toEqual([
      ["A", "1/3 → 2/3"],
      ["B", "3/3 → 3/3"],
    ]);
    expect(passed("All briefs")).toEqual([
      ["A", "3/6 → 5/6"],
      ["B", "6/6 → 6/6"],
    ]);
    // Each run is named by its results file.
    const legend = doc.querySelector(".runs")?.textContent ?? "";
    expect(legend).toMatch(/A\s*2026-10-26-before/);
    expect(legend).toMatch(/B\s*2026-10-27-after/);
    // Runs over the same screen briefs aren't flagged.
    expect(doc.querySelector(".brief-sets-differ")).toBeNull();
  });

  it("flags a comparison whose runs cover different screen briefs", async () => {
    const at = setup();
    const a = write(at, "2026-10-26-before.json", runA(at));
    const b = write(
      at,
      "2026-10-27-after.json",
      runB(at, ["invoice-queue", "payment-run"])
    );

    await report(at, [a, b]);

    const { doc } = written(at);
    const flag = doc.querySelector(".brief-sets-differ")?.textContent ?? "";
    expect(flag).toMatch(/only in A: payment-status/);
    expect(flag).toMatch(/only in B: payment-run/);
    // A brief a run never had reads as absent, not as 0/0.
    expect(
      rows(doc, "payment-run").map((row) => [
        row["Run"],
        row["Passed (first attempt → final)"],
      ])
    ).toEqual([
      ["A", "not in this run"],
      ["B", "3/3 → 3/3"],
    ]);
  });

  describe("--latest, as the Pages deploy calls it", () => {
    it("reports on the results file that started last, written to --out", async () => {
      const at = setup();
      // Named to sort the other way, so the start time decides.
      write(at, "2026-10-27-z-before.json", {
        ...runA(at),
        startedAt: "2026-10-26T13:05:09.000Z",
      });
      write(at, "2026-10-27-a-after.json", runB(at));
      const out = join(at.dir, "site", "evals", "index.html");

      const { code } = await report(at, [
        "--latest",
        "--no-screenshots",
        "--out",
        out,
      ]);

      expect(code).toBe(0);
      const doc = new DOMParser().parseFromString(
        readFileSync(out, "utf8"),
        "text/html"
      );
      expect(doc.querySelector(".runs")?.textContent).toContain(
        "2026-10-27-a-after"
      );
    });

    it("writes nothing, and still exits 0, while no results file is committed", async () => {
      const at = setup();
      const out = join(at.dir, "site", "evals", "index.html");

      const { code, output } = await report(at, ["--latest", "--out", out]);

      expect(code).toBe(0);
      expect(output).toMatch(/no results file/i);
      expect(existsSync(out)).toBe(false);
    });
  });

  describe("screenshots", () => {
    const shot = (n: number, theme: string, state: string) =>
      `data:image/png;base64,${png(`${n} ${theme} screens-invoice-queue--${state}`)}`;

    it("embeds each rep's final and failing code attempts' screenshots when the run's scratch folder exists", async () => {
      const at = setup();
      const file = runA(at);
      // invoice-queue rep 2: code attempt 1 fails gate 3, attempt 2 passes.
      const repaired = file.reps.find(
        (each) => each.brief === "invoice-queue" && each.rep === 2
      )!;
      scratch(at, repaired.workDir!, [1, 2]);
      const a = write(at, "2026-10-26-before.json", file);

      await report(at, [a]);

      const { doc } = written(at);
      expect(figures(doc)).toEqual([
        { src: shot(1, "light", "default"), caption: "light · default" },
        { src: shot(1, "dark", "default"), caption: "dark · default" },
        {
          src: shot(1, "light", "rows-selected"),
          caption: "light · rows-selected",
        },
        {
          src: shot(1, "dark", "rows-selected"),
          caption: "dark · rows-selected",
        },
        { src: shot(2, "light", "default"), caption: "light · default" },
        { src: shot(2, "dark", "default"), caption: "dark · default" },
        {
          src: shot(2, "light", "rows-selected"),
          caption: "light · rows-selected",
        },
        {
          src: shot(2, "dark", "rows-selected"),
          caption: "dark · rows-selected",
        },
      ]);
    });

    it("leaves screenshots out when the run's scratch folder doesn't exist", async () => {
      const at = setup();
      const a = write(at, "2026-10-26-before.json", runA(at));

      await report(at, [a]);

      const { doc } = written(at);
      expect(doc.querySelectorAll("img")).toHaveLength(0);
      // The reps and their failures are still there.
      expect(doc.body.textContent).toContain(
        'gate 4 · some-rule · <div class="x"> · It broke.'
      );
    });

    it("leaves screenshots out with --no-screenshots, as the Pages deploy builds it", async () => {
      const at = setup();
      const file = runA(at);
      const repaired = file.reps.find(
        (each) => each.brief === "invoice-queue" && each.rep === 2
      )!;
      scratch(at, repaired.workDir!, [1, 2]);
      const a = write(at, "2026-10-26-before.json", file);

      await report(at, [a, "--no-screenshots"]);

      const { doc } = written(at);
      expect(doc.querySelectorAll("img")).toHaveLength(0);
    });
  });
});
