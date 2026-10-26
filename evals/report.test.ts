// `pnpm eval:report` from hand-written results files (ADR 0008). Each test
// writes its own results files, scratch folders and reports folder, and reads
// the report back as a document.

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { main } from "./report.ts";
import {
  type At,
  png,
  runA,
  runB,
  scratch,
  setup,
  write,
} from "./report-fixtures.ts";
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

// The summary table's rows for one screen brief ("All screen briefs" for the
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
    expect(flag).toMatch(/aren't over the same screen briefs/);
    // A brief a run never had reads as absent, not as 0/0.
    expect(rows(doc, "payment-run")).toEqual([
      expect.objectContaining({ "Passed (final)": "– → 3/3", Errors: "– → 0" }),
    ]);
    expect(rows(doc, "payment-status")).toEqual([
      expect.objectContaining({ "Passed (final)": "3/3 → –" }),
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
