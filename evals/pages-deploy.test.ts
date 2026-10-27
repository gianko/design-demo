// The Pages deploy (ADR 0009, spec § Pages deploy): the CI workflow's second
// job, read from .github/workflows/ci.yml. Its report step runs here as the
// workflow writes it, against hand-written results files; the rest of the job
// only runs on a push to main, so its shape is checked instead.

import { existsSync, readFileSync, utimesSync } from "node:fs";
import { join, posix } from "node:path";
import { describe, expect, it, onTestFinished } from "vitest";
import { parse } from "yaml";
import { main } from "./report.ts";
import { runA, runB, scratch, setup, write } from "./report-fixtures.ts";
import { repo } from "../repo.ts";

type Step = {
  name?: string;
  if?: string;
  uses?: string;
  run?: string;
  with?: Record<string, unknown>;
};
type Job = {
  needs?: string | string[];
  if?: string;
  permissions?: Record<string, string>;
  environment?: { name: string; url?: string };
  concurrency?: { group: string; "cancel-in-progress"?: boolean };
  steps: Step[];
};
const workflow = parse(
  readFileSync(join(repo, ".github", "workflows", "ci.yml"), "utf8")
) as { jobs: Record<string, Job> };
const { gate, pages } = workflow.jobs;

const uses = (job: Job | undefined, action: string) =>
  job?.steps.filter((step) => step.uses?.startsWith(`${action}@`)) ?? [];

// The report step's arguments to `pnpm eval:report`, as the workflow has them.
function reportArgs() {
  const steps = pages?.steps.filter((step) =>
    step.run?.trim().startsWith("pnpm eval:report")
  );
  expect(steps).toHaveLength(1);
  const [, , ...args] = steps![0]!.run!.trim().split(/\s+/);
  return args;
}

// Runs the report step from `dir`, as CI runs it from the checkout, with
// `resultsDir` standing in for the committed evals/results.
async function runReportStep(dir: string, resultsDir: string) {
  const cwd = process.cwd();
  process.chdir(dir);
  onTestFinished(() => process.chdir(cwd));
  const lines: string[] = [];
  const code = await main(reportArgs(), {
    log: (line) => lines.push(line),
    resultsDir,
  });
  return { code, output: lines.join("\n") };
}

// Where the report step writes, relative to the checkout.
function reportOut() {
  const args = reportArgs();
  const out = args[args.indexOf("--out") + 1];
  expect(out).toBeDefined();
  return posix.normalize(out!);
}

// The folder the job hands to Pages.
function siteDir() {
  const [upload] = uses(pages, "actions/upload-pages-artifact");
  expect(upload?.with?.path).toBeTypeOf("string");
  return posix.normalize(String(upload!.with!.path)).replace(/\/$/, "");
}

describe("the Pages deploy job", () => {
  it("runs only on a push to main, and only once the gate job has passed", () => {
    expect(pages).toBeDefined();
    const needs = [pages!.needs ?? []].flat();
    expect(needs).toContain("gate");
    const condition = pages!.if ?? "";
    expect(condition).toMatch(/github\.event_name\s*==\s*'push'/);
    expect(condition).toMatch(/github\.ref\s*==\s*'refs\/heads\/main'/);
    // A status function would let the job run after a red or cancelled gate
    // job; without one, `needs` skips it unless the gate job succeeded.
    expect(condition).not.toMatch(/always\(|failure\(|cancelled\(|success\(/);
  });

  it("is the only job that can publish to Pages", () => {
    for (const [name, job] of Object.entries(workflow.jobs)) {
      const publishes =
        uses(job, "actions/deploy-pages").length > 0 ||
        job.permissions?.pages === "write";
      expect(publishes, name).toBe(name === "pages");
    }
    expect(uses(pages, "actions/deploy-pages")).toHaveLength(1);
    expect(pages!.permissions).toMatchObject({
      pages: "write",
      "id-token": "write",
    });
    expect(pages!.environment?.name).toBe("github-pages");
    // A deploy in progress finishes; the next one waits for it.
    expect(pages!.concurrency?.["cancel-in-progress"]).toBe(false);
  });

  it("publishes the gate job's own Storybook build at the Pages root", () => {
    // The gate job uploads the storybook-static it gated, and only when every
    // step before it passed: a status function would upload a red build.
    const uploads = uses(gate, "actions/upload-artifact").filter(
      (step) =>
        posix.normalize(String(step.with?.path)).replace(/\/$/, "") ===
        "storybook-static"
    );
    expect(uploads).toHaveLength(1);
    const [upload] = uploads;
    expect(upload!.if ?? "").not.toMatch(/always\(|failure\(|cancelled\(/);
    // The deploy job downloads it to the root of what it hands to Pages.
    const downloads = uses(pages, "actions/download-artifact").filter(
      (step) => step.with?.name === upload!.with?.name
    );
    expect(downloads).toHaveLength(1);
    expect(
      posix.normalize(String(downloads[0]!.with?.path)).replace(/\/$/, "")
    ).toBe(siteDir());
  });

  it("writes the report to /evals/ on the Pages site", () => {
    expect(reportOut()).toBe(`${siteDir()}/evals/index.html`);
  });

  describe("its report step", () => {
    it("reports on the newest committed results file, without screenshots", async () => {
      const at = setup();
      const newest = runB(at);
      newest.startedAt = "2026-11-03T09:00:00.000Z";
      // Its scratch exists, so the report would embed screenshots unless the
      // step leaves them out.
      scratch(at, newest.reps[0]!.workDir!, [1]);
      write(at, "2026-11-03-a-after.json", newest);
      // The older run is named to sort after it and written after it, so
      // neither the file name nor the write order decides.
      const older = runA(at);
      older.startedAt = "2026-11-02T09:00:00.000Z";
      const olderPath = join(
        repo,
        write(at, "2026-11-03-z-before.json", older)
      );
      const later = new Date(Date.now() + 60_000);
      utimesSync(olderPath, later, later);

      const { code } = await runReportStep(at.dir, at.resultsDir);

      expect(code).toBe(0);
      const out = join(at.dir, reportOut());
      const doc = new DOMParser().parseFromString(
        readFileSync(out, "utf8"),
        "text/html"
      );
      const legend = doc.querySelector(".runs")?.textContent ?? "";
      expect(legend).toContain("2026-11-03-a-after");
      expect(legend).not.toContain("2026-11-03-z-before");
      expect(doc.querySelectorAll("img")).toHaveLength(0);
    });

    it("compares the newest results file against the one it names as its baseline", async () => {
      const at = setup();
      const shared = [
        "invoice-queue",
        "invoice-review",
        "payment-overview",
        "payment-run",
        "payment-status",
      ];
      const baseline = runA(at, shared);
      baseline.startedAt = "2026-10-26T23:51:35.118Z";
      write(at, "2026-10-26-rerun.json", baseline);
      // Newer than the baseline but not named by the newest: not compared.
      const between = runA(at, shared);
      between.startedAt = "2026-10-30T09:00:00.000Z";
      write(at, "2026-10-30-between.json", between);
      const newest = runB(at, [...shared, "bulk-pay", "my-invoices"]);
      newest.startedAt = "2026-11-03T09:00:00.000Z";
      newest.baseline = "2026-10-26-rerun";
      scratch(at, newest.reps[0]!.workDir!, [1]);
      write(at, "2026-11-03-p1.json", newest);

      const { code } = await runReportStep(at.dir, at.resultsDir);

      expect(code).toBe(0);
      const doc = new DOMParser().parseFromString(
        readFileSync(join(at.dir, reportOut()), "utf8"),
        "text/html"
      );
      expect(doc.querySelector("h1")?.textContent).toMatch(/comparison/i);
      const legend = doc.querySelector(".runs")?.textContent ?? "";
      expect(legend).toMatch(/A\s*2026-10-26-rerun/);
      expect(legend).toMatch(/B\s*2026-11-03-p1/);
      expect(legend).not.toContain("2026-10-30-between");
      // The shared five side by side, the newest run's own two alone.
      expect(
        [...doc.querySelectorAll(".brief-set h3")].map((h) => h.textContent)
      ).toEqual(["In both runs (5), side by side", "Only in run B (2)"]);
      expect(doc.querySelectorAll("img")).toHaveLength(0);
    });

    it("lets Storybook deploy while no results file is committed: it writes nothing and exits 0", async () => {
      const at = setup();

      const { code, output } = await runReportStep(at.dir, at.resultsDir);

      expect(code).toBe(0);
      expect(output).toMatch(/no results file/i);
      expect(existsSync(join(at.dir, reportOut()))).toBe(false);
      // No later step waits on the report.
      const after = pages!.steps.slice(
        pages!.steps.findIndex((step) =>
          step.run?.trim().startsWith("pnpm eval:report")
        ) + 1
      );
      for (const step of after) expect(step.if).toBeUndefined();
    });
  });
});
