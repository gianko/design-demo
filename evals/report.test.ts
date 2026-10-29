// `pnpm evals:report` from hand-written results files (ADR 0008). Each test
// writes its own results files, scratch folders and reports folder, and reads
// the report back as a document.

import { existsSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { main } from "./report.ts";
import {
  type At,
  gate5,
  gate5NotRun,
  judged,
  png,
  runA,
  runB,
  scratch,
  setup,
  write,
} from "./report-fixtures.ts";
import type { Criterion } from "../generator/conformance.ts";
import type { ResultsFile } from "./results.ts";
import { repo } from "../repo.ts";

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

// One summary table's rows, each keyed by its column heading.
function tableRows(table: Element) {
  const headings = [...table.querySelectorAll("thead th")].map(
    (th) => th.textContent?.trim() ?? ""
  );
  return [...table.querySelectorAll("tbody tr")].map((tr) =>
    Object.fromEntries(
      [...tr.querySelectorAll("th, td")].map((cell, i) => [
        headings[i],
        cell.textContent?.trim().replace(/\s+/g, " "),
      ])
    )
  );
}

// The summary tables' rows for one screen brief ("All screen briefs" for the
// overall row), each keyed by its column heading.
function rows(doc: Document, brief: string) {
  return [...doc.querySelectorAll("table.summary")]
    .flatMap(tableRows)
    .filter((row) => row["Screen brief"] === brief);
}

// The gate 5 tables' rows for one screen brief, as rows() reads them.
function gate5Rows(doc: Document, brief: string) {
  return [...doc.querySelectorAll("table.gate5")]
    .flatMap(tableRows)
    .filter((row) => row["Screen brief"] === brief);
}

// One screen brief's gate 5 cells, less the screen brief's own.
function gate5Cells(doc: Document, brief: string) {
  const [row] = gate5Rows(doc, brief);
  expect(row, brief).toBeDefined();
  return Object.entries(row!)
    .filter(([heading]) => heading !== "Screen brief")
    .map(([, cell]) => cell);
}

// The run legend's cells for one row, one per run.
function legendRow(doc: Document, label: string) {
  const row = [...doc.querySelectorAll(".runs tbody tr")].find(
    (tr) => tr.querySelector("th")?.textContent?.trim() === label
  );
  return [...(row?.querySelectorAll("td") ?? [])].map((td) =>
    td.textContent?.trim()
  );
}

// A comparison's summary tables when its runs' brief sets differ: each
// table's heading and the screen briefs it has a row for, overall row last.
function briefSets(doc: Document) {
  return [...doc.querySelectorAll(".brief-set")].map((set) => ({
    heading: set.querySelector("h3")?.textContent?.trim(),
    briefs: tableRows(set.querySelector("table.summary")!).map(
      (row) => row["Screen brief"]
    ),
  }));
}

describe("pnpm evals:report", () => {
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

  it("renders in the light theme, never following the OS colour scheme (ADR 0002: none in P0)", async () => {
    const at = setup();
    const a = write(at, "2026-10-26-before.json", runA(at));

    await report(at, [a]);

    const { html, doc } = written(at);
    expect(doc.documentElement.dataset.theme).toBe("light");
    expect(doc.querySelectorAll("script")).toHaveLength(0);
    expect(html).not.toMatch(/prefers-color-scheme/);
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
    expect(rows(doc, "All screen briefs")).toEqual([
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

  it("turns two results files into a comparison, each count reading run A → run B per screen brief and overall", async () => {
    const at = setup();
    const a = write(at, "2026-10-26-before.json", runA(at));
    const b = write(at, "2026-10-27-after.json", runB(at));

    const { code } = await report(at, [a, b]);

    expect(code).toBe(0);
    const { name, doc } = written(at);
    expect(name).toBe("2026-10-26-before-vs-2026-10-27-after.html");
    expect(doc.querySelector("h1")?.textContent).toMatch(/comparison/i);
    // ADR 0008: `2/3 → 3/3` is run A's final passes → run B's.
    expect(rows(doc, "invoice-queue")).toEqual([
      {
        "Screen brief": "invoice-queue",
        "Passed (final)": "2/3 → 3/3",
        "Passed (first attempt)": "1/3 → 3/3",
        Errors: "0 → 0",
        Skipped: "0 → 0",
        "Mean attempts (spec · code)": "1.0 · 2.0 → 1.0 · 1.0",
        Cost: "$0.90 → $0.60",
        "Wall time": "3m 30s → 1m 30s",
        "gate 1": "0 → 0",
        "gate 2": "0 → 0",
        "gate 3": "2 → 0",
        "gate 7 static": "0 → 0",
        "gate 4": "2 → 0",
        "gate 7 render": "1 → 0",
      },
    ]);
    expect(rows(doc, "payment-status")).toEqual([
      expect.objectContaining({
        "Passed (final)": "3/3 → 3/3",
        "Passed (first attempt)": "2/3 → 3/3",
      }),
    ]);
    expect(rows(doc, "All screen briefs")).toEqual([
      expect.objectContaining({
        "Passed (final)": "5/6 → 6/6",
        "Passed (first attempt)": "3/6 → 6/6",
      }),
    ]);
    // Each run is named by its results file.
    const legend = doc.querySelector(".runs")?.textContent ?? "";
    expect(legend).toMatch(/A\s*2026-10-26-before/);
    expect(legend).toMatch(/B\s*2026-10-27-after/);
    // Runs over the same screen briefs aren't flagged, and share one table.
    expect(doc.querySelector(".brief-sets-differ")).toBeNull();
    expect(briefSets(doc)).toEqual([]);
  });

  it("flags a comparison whose runs cover different screen briefs, and shows each run's own screen briefs alone", async () => {
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
    expect(briefSets(doc)).toEqual([
      {
        heading: "In both runs (1), side by side",
        briefs: ["invoice-queue", "All in both runs (1)"],
      },
      {
        heading: "Only in run A (1)",
        briefs: ["payment-status", "All only in A (1)"],
      },
      {
        heading: "Only in run B (1)",
        briefs: ["payment-run", "All only in B (1)"],
      },
    ]);
    // A brief only one run has reads as that run's own count, not as – → 3/3.
    expect(rows(doc, "payment-status")).toEqual([
      expect.objectContaining({
        "Passed (final)": "3/3",
        "Passed (first attempt)": "2/3",
        Errors: "0",
      }),
    ]);
    expect(rows(doc, "payment-run")).toEqual([
      expect.objectContaining({ "Passed (final)": "3/3", Errors: "0" }),
    ]);
  });

  it("compares a 5-brief run with a 15-brief run: the 5 shared side by side, the other 10 alone, each overall row over its own set", async () => {
    const at = setup();
    const shared = [
      "invoice-queue",
      "invoice-review",
      "payment-overview",
      "payment-run",
      "payment-status",
    ];
    const added = [
      "bulk-pay",
      "overdue-invoices",
      "failed-payments",
      "contractors",
      "run-history",
      "my-invoices",
      "payments-received",
      "payment-failed",
      "withdraw-invoice",
      "annual-summary",
    ];
    const a = write(at, "2026-10-26-rerun.json", runA(at, shared));
    const b = write(at, "2026-11-03-p1.json", runB(at, [...shared, ...added]));

    await report(at, [a, b]);

    const { doc } = written(at);
    expect(briefSets(doc)).toEqual([
      {
        heading: "In both runs (5), side by side",
        briefs: [...shared, "All in both runs (5)"],
      },
      {
        heading: "Only in run B (10)",
        briefs: [...added, "All only in B (10)"],
      },
    ]);
    // Side by side, A → B: invoice-queue 2/3 → 3/3, the rest 3/3 → 3/3.
    expect(rows(doc, "invoice-queue")).toEqual([
      expect.objectContaining({
        "Passed (final)": "2/3 → 3/3",
        "Passed (first attempt)": "1/3 → 3/3",
      }),
    ]);
    // Run A's 15 reps against run B's 15 reps of the same 5 screen briefs,
    // not against all 45 of run B's.
    expect(rows(doc, "All in both runs (5)")).toEqual([
      expect.objectContaining({
        "Passed (final)": "14/15 → 15/15",
        "Passed (first attempt)": "12/15 → 15/15",
        Cost: "$3.40 → $3.00",
      }),
    ]);
    // Alone: run B's own counts, with no arrow.
    expect(rows(doc, "bulk-pay")).toEqual([
      expect.objectContaining({
        "Passed (final)": "3/3",
        "Passed (first attempt)": "3/3",
        Errors: "0",
        Cost: "$0.60",
      }),
    ]);
    expect(rows(doc, "All only in B (10)")).toEqual([
      expect.objectContaining({
        "Passed (final)": "30/30",
        "Passed (first attempt)": "30/30",
        Cost: "$6.00",
      }),
    ]);
    // Each screen brief has exactly one row.
    for (const brief of [...shared, ...added])
      expect(rows(doc, brief), brief).toHaveLength(1);
    expect(rows(doc, "All screen briefs")).toEqual([]);
  });

  it("names the pass criteria a rep's final UI spec missed, as written", async () => {
    const at = setup();
    const file = runA(at);
    file.reps[0]!.criteria = {
      met: false,
      missing: ["component Toast", "state <scheduled>"],
    };
    const a = write(at, "2026-10-26-before.json", file);

    await report(at, [a]);

    const { doc } = written(at);
    expect(doc.body.textContent).toContain(
      "Pass criteria missing: component Toast, state <scheduled>"
    );
  });

  describe("gate 5", () => {
    // invoice-queue: all six pass on both states in rep 1; rep 2 repeats
    // itself on payment-scheduled; rep 3, which failed, overuses the accent
    // on default. payment-status: rep 2's judge call failed.
    const judgedA = (at: At) =>
      judged(runA(at), (rep) =>
        rep.slug === "invoice-queue"
          ? gate5(
              (
                [
                  { default: [], "payment-scheduled": [] },
                  { default: [], "payment-scheduled": ["repetition"] },
                  { default: ["accent"], "payment-scheduled": [] },
                ] satisfies Record<string, Criterion[]>[]
              )[rep.rep - 1]!
            )
          : rep.rep === 2
            ? gate5NotRun
            : gate5({ default: [] })
      );
    const allPass = () => gate5({ default: [], "payment-scheduled": [] });

    it("gives a pass rate per criterion per screen brief and overall, over the reps judged, beside the score and the judge's cost", async () => {
      const at = setup();
      const a = write(at, "2026-10-29-p2.json", judgedA(at));

      await report(at, [a]);

      const { doc } = written(at);
      expect(gate5Rows(doc, "invoice-queue")).toEqual([
        {
          "Screen brief": "invoice-queue",
          Judged: "3/3",
          hierarchy: "3/3",
          density: "3/3",
          accent: "2/3",
          elevation: "3/3",
          copy: "3/3",
          repetition: "2/3",
          Score: "16/18",
          Cost: "$0.30",
        },
      ]);
      expect(gate5Rows(doc, "payment-status")).toEqual([
        expect.objectContaining({
          Judged: "2/3",
          accent: "2/2",
          repetition: "2/2",
          Score: "12/12",
          Cost: "$0.10",
        }),
      ]);
      expect(gate5Rows(doc, "All screen briefs")).toEqual([
        expect.objectContaining({
          Judged: "5/6",
          hierarchy: "5/5",
          accent: "4/5",
          repetition: "4/5",
          Score: "28/30",
          Cost: "$0.40",
        }),
      ]);
      // Soft: the passes are the generator's alone.
      expect(rows(doc, "invoice-queue")).toEqual([
        expect.objectContaining({
          "Passed (first attempt → final)": "1/3 → 2/3",
        }),
      ]);
      // The cost takes in the judge's, and says how much, so a run from
      // before gate 5 compares fairly.
      expect(rows(doc, "All screen briefs")).toEqual([
        expect.objectContaining({
          Cost: expect.stringMatching(/^\$\d+\.\d\d, of which gate 5 \$0\.40$/),
        }),
      ]);
      expect(legendRow(doc, "Gate 5 judge")).toEqual([
        "claude-opus-5-5, high effort",
      ]);
    });

    it("shows a run without gate 5 as not run, never as zero", async () => {
      const at = setup();
      const a = write(at, "2026-10-26-before.json", runA(at));

      await report(at, [a]);

      const { doc } = written(at);
      for (const brief of [
        "invoice-queue",
        "payment-status",
        "All screen briefs",
      ]) {
        expect(gate5Cells(doc, brief), brief).toEqual(Array(9).fill("not run"));
        expect(rows(doc, brief)[0]!.Cost, brief).toMatch(/^\$\d+\.\d\d$/);
      }
      expect(legendRow(doc, "Gate 5 judge")).toEqual(["not run"]);
    });

    it("compares gate 5 against a baseline that has it, run A → run B, and shows a baseline without it as not run", async () => {
      const at = setup();
      const plain = write(at, "2026-10-26-before.json", runA(at));
      const withGate5 = write(at, "2026-10-28-before.json", judgedA(at));
      const b = write(at, "2026-10-29-after.json", judged(runB(at), allPass));

      await report(at, [withGate5, b]);
      const both = written(at).doc;
      rmSync(at.reportsDir, { recursive: true });
      await report(at, [plain, b]);
      const onlyB = written(at).doc;

      expect(gate5Rows(both, "invoice-queue")).toEqual([
        expect.objectContaining({
          Judged: "3/3 → 3/3",
          hierarchy: "3/3 → 3/3",
          accent: "2/3 → 3/3",
          repetition: "2/3 → 3/3",
          Score: "16/18 → 18/18",
        }),
      ]);
      expect(gate5Rows(both, "All screen briefs")).toEqual([
        expect.objectContaining({ Judged: "5/6 → 6/6", accent: "4/5 → 6/6" }),
      ]);
      expect(gate5Rows(onlyB, "invoice-queue")).toEqual([
        expect.objectContaining({
          Judged: "not run → 3/3",
          accent: "not run → 3/3",
          Score: "not run → 18/18",
          Cost: "not run → $0.30",
        }),
      ]);
    });

    it("lists each rep's failing verdicts with their reasons, or why gate 5 didn't run", async () => {
      const at = setup();
      const a = write(at, "2026-10-29-p2.json", judgedA(at));

      await report(at, [a]);

      const text = written(at).doc.body.textContent ?? "";
      expect(text).toContain(
        'gate 5 · payment-scheduled · repetition · The payment-scheduled state breaks repetition, as "Every status tag carries its word."'
      );
      expect(text).toContain("gate 5 · 5/6 · soft");
      expect(text).toContain("gate 5 not run · 1 of 1 state unjudged");
    });

    it("still loads and renders every committed results file, with gate 5 not run in those from before it", async () => {
      const dir = join(repo, "evals", "results");
      const names = readdirSync(dir).filter((name) => name.endsWith(".json"));
      expect(names.length).toBeGreaterThan(0);
      for (const name of names) {
        const at = setup();
        const file = JSON.parse(
          readFileSync(join(dir, name), "utf8")
        ) as ResultsFile;

        const { code } = await report(at, [
          join(dir, name),
          "--no-screenshots",
        ]);

        expect(code, name).toBe(0);
        const { doc } = written(at);
        const cells = gate5Cells(doc, "All screen briefs");
        if (file.reps.every((rep) => rep.gate5 === undefined)) {
          expect(new Set(cells), name).toEqual(new Set(["not run"]));
          expect(legendRow(doc, "Gate 5 judge"), name).toEqual(["not run"]);
        }
      }
    });
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

    it("fails, writing nothing, when the newest results file names a baseline that isn't there", async () => {
      const at = setup();
      write(at, "2026-10-27-after.json", {
        ...runB(at),
        baseline: "2026-10-26-gone",
      });
      const out = join(at.dir, "site", "evals", "index.html");

      const { code, output } = await report(at, ["--latest", "--out", out]);

      expect(code).toBe(1);
      expect(output).toMatch(/2026-10-26-gone.*doesn't exist/);
      expect(existsSync(out)).toBe(false);
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
        (each) => each.slug === "invoice-queue" && each.rep === 2
      )!;
      scratch(at, repaired.workDir!, [1, 2]);
      const a = write(at, "2026-10-26-before.json", file);

      await report(at, [a]);

      const { doc } = written(at);
      expect(figures(doc)).toEqual([
        { src: shot(1, "light", "default"), caption: "light · default" },
        { src: shot(1, "dark", "default"), caption: "dark · default" },
        {
          src: shot(1, "light", "payment-scheduled"),
          caption: "light · payment-scheduled",
        },
        {
          src: shot(1, "dark", "payment-scheduled"),
          caption: "dark · payment-scheduled",
        },
        { src: shot(2, "light", "default"), caption: "light · default" },
        { src: shot(2, "dark", "default"), caption: "dark · default" },
        {
          src: shot(2, "light", "payment-scheduled"),
          caption: "light · payment-scheduled",
        },
        {
          src: shot(2, "dark", "payment-scheduled"),
          caption: "dark · payment-scheduled",
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
        (each) => each.slug === "invoice-queue" && each.rep === 2
      )!;
      scratch(at, repaired.workDir!, [1, 2]);
      const a = write(at, "2026-10-26-before.json", file);

      await report(at, [a, "--no-screenshots"]);

      const { doc } = written(at);
      expect(doc.querySelectorAll("img")).toHaveLength(0);
    });
  });
});
