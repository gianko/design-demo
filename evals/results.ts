// The committed results file of one eval run (ADR 0008):
// `evals/results/<YYYY-MM-DD>-<label>.json`. It holds the version tuple, what
// narrowed the run, its totals and, per rep, its outcome and every attempt's
// gate results with failure messages, usage, cost and wall time, and its
// final screen's gate 5 verdicts (ADR 0014). The eval
// report (`pnpm eval:report`) reads these files, and the runner reads the
// latest one for its estimate.

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { Attempt, EndReason, Versions } from "../generator/generate.ts";
import {
  type Criterion,
  type Gate5,
  type JudgeVersions,
  rubricCriteria,
  screenPasses,
} from "../generator/conformance.ts";
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

export type RepResult = {
  // The screen brief's slug.
  slug: string;
  // Counted within its screen brief, from 1.
  rep: number;
  outcome: RepOutcome;
  endReason: RepEndReason;
  // Passed with no repair turn: one attempt in each step.
  firstAttempt: boolean;
  // Checked once, on the final UI spec; null for a skipped rep.
  criteria: CriteriaResult | null;
  // USD, its attempts' and its gate 5 calls'.
  cost: number;
  wallMs: number;
  // The rep's scratch folder, relative to the repo, or null if it never
  // started: `evals/runs/<run-id>/<slug>-<rep>/`.
  workDir: string | null;
  // Each attempt as generate() logged it (ADR 0010).
  attempts: Attempt[];
  // Gate 5 on the final screen, after the last attempt (ADR 0014). It's
  // soft: it's beside the outcome, never in it. Null for a rep that ended in
  // error or was skipped, which isn't judged; absent from results files from
  // before gate 5.
  gate5?: RepGate5 | null;
};

// One rep's brief conformance: each screen state's verdicts with their
// reasons, or why it wasn't judged, and the score once every state was.
// The prompt hash is the run's, in its version tuple.
export type RepGate5 = Omit<Gate5, "promptHash">;

// A count out of the reps a pass rate counts.
export type Rate = { passed: number; of: number };

// Whether a pass rate counts the rep: it passed or failed. Errors and skips
// say nothing about the generator (ADR 0008).
export const counted = (rep: RepResult) =>
  rep.outcome === "pass" || rep.outcome === "fail";

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
  // Gate 5 over the same reps, soft and apart from the pass rates. Null for
  // a run without gate 5; absent from results files from before it.
  gate5?: Gate5Tally | null;
};

// Brief conformance over some reps that passed or failed (ADR 0014).
export type Gate5Tally = {
  // Reps with every state judged.
  judged: number;
  // Reps that passed or failed whose gate 5 didn't run.
  notRun: number;
  // Per criterion, the judged reps whose every state passed it.
  criteria: Record<Criterion, Rate>;
  // Criteria passed out of six, summed over the judged reps.
  score: Rate;
  // USD, every judge call's, judged or not.
  cost: number;
};

export type ResultsFile = {
  runId: string;
  startedAt: string;
  finishedAt: string;
  // The version tuple (ADR 0008): the generator's half, then the run's.
  versions: Versions & {
    // Gate 5's judge (ADR 0014); absent from results files from before it.
    judge?: JudgeVersions;
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
  // The results file this run is compared against, by name less `.json`, as
  // `--baseline` gave it: the Pages deploy reports the newest run against
  // it. Absent or null when there's none; files from before it have none.
  baseline?: string | null;
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
  const of = reps.filter(counted).length;
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
    gate5: reps.some((rep) => rep.gate5 !== undefined)
      ? gate5Tally(reps)
      : null,
  };
}

function gate5Tally(reps: RepResult[]): Gate5Tally {
  const ran = reps.filter(counted).map((rep) => rep.gate5);
  const judged = ran.filter((each): each is RepGate5 => each?.ran === true);
  const sum = (count: (gate5: RepGate5) => number) =>
    judged.reduce((total, each) => total + count(each), 0);
  return {
    judged: judged.length,
    notRun: ran.length - judged.length,
    criteria: Object.fromEntries(
      rubricCriteria.map((criterion) => [
        criterion,
        {
          passed: judged.filter((each) => screenPasses(each.states, criterion))
            .length,
          of: judged.length,
        },
      ])
    ) as Record<Criterion, Rate>,
    score: {
      passed: sum((each) => each.score?.passed ?? 0),
      of: sum((each) => each.score?.of ?? 0),
    },
    cost: reps.reduce((total, rep) => total + (rep.gate5?.cost ?? 0), 0),
  };
}
