// The committed results file of one eval run (ADR 0008):
// `evals/results/<YYYY-MM-DD>-<label>.json`. It holds the version tuple, what
// narrowed the run, its totals and, per rep, its outcome and every attempt's
// gate results with failure messages, usage, cost and wall time. The eval
// report (`pnpm eval:report`) reads these files, and the runner reads the
// latest one for its estimate.

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { StepConfig } from "../generator/config.ts";
import type { Attempt, EndReason } from "../generator/generate.ts";
import type { CriteriaResult } from "../generator/pass-criteria.ts";

// How a rep ends (glossary: Rep). Errors and skips are counted but left out
// of pass rates.
export type RepOutcome = "pass" | "fail" | "error" | "skipped";

export type RepEndReason =
  | EndReason
  // Every hard gate passed, but the final UI spec misses a pass criterion.
  | "criteria-not-met"
  // The budget ran out before the rep could start.
  | "skipped:budget";

// One attempt as generate() logged it (ADR 0010).
export type AttemptResult = Attempt;

export type RepResult = {
  brief: string;
  // Counted within its screen brief, from 1.
  rep: number;
  outcome: RepOutcome;
  endReason: RepEndReason;
  // Passed with no repair turn: one attempt in each step.
  firstAttempt: boolean;
  // Checked once, on the final UI spec; null for a skipped rep.
  criteria: CriteriaResult | null;
  // USD, the sum of its attempts' costs.
  cost: number;
  wallMs: number;
  // The rep's scratch folder, relative to the repo, or null if it never
  // started: `evals/runs/<run-id>/<brief>-<rep>/`.
  workDir: string | null;
  attempts: AttemptResult[];
};

// A count out of the reps a pass rate counts: those that passed or failed.
export type Rate = { passed: number; of: number };

export type Tally = {
  reps: number;
  pass: number;
  fail: number;
  error: number;
  skipped: number;
  firstAttempt: Rate;
  final: Rate;
  cost: number;
  wallMs: number;
};

export type ResultsFile = {
  runId: string;
  startedAt: string;
  finishedAt: string;
  // The version tuple (ADR 0008).
  versions: {
    registryHash: string;
    specPromptHash: string;
    codePromptHash: string;
    spec: StepConfig;
    code: StepConfig;
    gitSha: string;
    // The tree had uncommitted changes, allowed by `--allow-dirty`.
    dirty: boolean;
    label: string;
  };
  // What narrowed the run, as given or defaulted.
  briefs: string;
  k: number;
  // USD, or null for `--budget none`.
  budget: number | null;
  concurrency: number;
  // The screen briefs `--briefs` matched, by slug.
  briefSlugs: string[];
  totals: Tally;
  perBrief: Record<string, Tally>;
  reps: RepResult[];
};

// The results file in `dir` that started last, or null if there's none: the
// one the runner's estimate reads, and the one the Pages deploy reports on.
export function latestResults(
  dir: string
): { path: string; file: ResultsFile } | null {
  if (!existsSync(dir)) return null;
  const files = readdirSync(dir)
    .filter((name) => name.endsWith(".json"))
    .map((name) => {
      const path = join(dir, name);
      return {
        path,
        file: JSON.parse(readFileSync(path, "utf8")) as Partial<ResultsFile>,
      };
    })
    .filter(
      (each): each is { path: string; file: ResultsFile } =>
        typeof each.file.startedAt === "string" && Array.isArray(each.file.reps)
    );
  files.sort((a, b) =>
    a.file.startedAt < b.file.startedAt
      ? 1
      : a.file.startedAt > b.file.startedAt
        ? -1
        : 0
  );
  return files[0] ?? null;
}

// Counts, pass rates, cost and wall time over some reps.
export function tally(reps: RepResult[]): Tally {
  const count = (outcome: RepOutcome) =>
    reps.filter((rep) => rep.outcome === outcome).length;
  const pass = count("pass");
  const of = pass + count("fail");
  return {
    reps: reps.length,
    pass,
    fail: count("fail"),
    error: count("error"),
    skipped: count("skipped"),
    firstAttempt: { passed: reps.filter((rep) => rep.firstAttempt).length, of },
    final: { passed: pass, of },
    cost: reps.reduce((sum, rep) => sum + rep.cost, 0),
    wallMs: reps.reduce((sum, rep) => sum + rep.wallMs, 0),
  };
}
