// `pnpm eval` (ADR 0008): one eval run. Every screen brief `--briefs` matches
// runs K times through generate(), in-process, three reps at a time, each in
// its own scratch folder under `evals/runs/<run-id>/`. A rep ends as pass,
// fail, error or skipped; the brief's pass criteria are checked once, on the
// final UI spec. The run writes one results file,
// `evals/results/<YYYY-MM-DD>-<label>.json`, with the version tuple, totals
// and every rep's attempts. A failing rep is data, so the run exits 0 once
// that file is written.

import { existsSync, globSync, mkdirSync, writeFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { parseArgs } from "node:util";
import type { Attempt, RepTrace, Versions } from "../generator/generate.ts";
import { checkPassCriteria } from "../generator/pass-criteria.ts";
import {
  readScreenBrief,
  type ScreenBrief,
} from "../generator/screen-brief.ts";
import {
  type AttemptResult,
  type RepResult,
  type ResultsFile,
  latestResults,
  tally,
} from "./results.ts";
import { repo } from "../repo.ts";

export type EvalDeps = {
  // One rep: generate() with the model and render pass bound.
  generate: (
    brief: ScreenBrief,
    options: { workDir: string; onAttempt?: (attempt: Attempt) => void }
  ) => Promise<RepTrace>;
  // The generator's half of the version tuple.
  versions: () => Promise<Versions>;
  git: () => Promise<{ sha: string; dirty: boolean }>;
  // Asked only when the estimate is over budget; false stops the run.
  confirm: (question: string) => Promise<boolean>;
  log?: (line: string) => void;
  now?: () => Date;
  resultsDir?: string;
  runsDir?: string;
};

const concurrency = 3;

const usage =
  "Usage: pnpm eval [--briefs <glob>] [--k <n>] [--budget <usd>|none] [--label <label>] [--allow-dirty]";

export async function main(argv: string[], deps: EvalDeps): Promise<number> {
  const log = deps.log ?? console.log;
  const now = deps.now ?? (() => new Date());
  const resultsDir = deps.resultsDir ?? join(repo, "evals", "results");
  const runsDir = deps.runsDir ?? join(repo, "evals", "runs");

  const args = parse(argv);
  if (typeof args === "string") {
    log(args);
    log(usage);
    return 2;
  }

  const paths = globSync(args.briefs, { cwd: repo }).sort();
  if (paths.length === 0) {
    log(`--briefs ${args.briefs} matches no screen briefs.`);
    return 2;
  }
  const briefs = paths.map((path) => readScreenBrief(resolve(repo, path)));

  // One file never mixes two moments (ADR 0008: no resume).
  const started = now();
  const out = join(resultsDir, `${day(started)}-${args.label}.json`);
  if (existsSync(out)) {
    log(
      `${relative(repo, out)} already exists. Give this run another --label.`
    );
    return 2;
  }

  // A results file names the commit it ran on, which a dirty tree isn't.
  const git = await deps.git();
  if (git.dirty && !args.allowDirty) {
    log(
      "The tree has uncommitted changes, so the git SHA wouldn't say what ran. Commit them, or pass --allow-dirty to run anyway and record it."
    );
    return 2;
  }
  if (git.dirty) log("dirty tree: allowed, and recorded");
  const versions = await deps.versions();

  // Screen briefs × K × the latest results file's median rep cost. The
  // Console spend limit stays the backstop.
  const median = latestMedianRepCost(resultsDir);
  if (median === null) {
    log("estimate: none, no earlier results file");
  } else {
    const estimate = briefs.length * args.k * median;
    const line = `estimate: ${dollars(estimate)} (${briefs.length} screen brief${briefs.length === 1 ? "" : "s"} × ${args.k} reps × ${dollars(median)} median rep cost), budget ${args.budget === null ? "none" : dollars(args.budget)}`;
    log(line);
    if (
      args.budget !== null &&
      estimate > args.budget &&
      !(await deps.confirm(
        `The estimate of ${dollars(estimate)} is over the ${dollars(args.budget)} budget, and the run will stop starting reps there. Run anyway?`
      ))
    ) {
      log("Not run.");
      return 1;
    }
  }

  const runId = `${stamp(started)}-${args.label}`;
  const runDir = join(runsDir, runId);

  // Rep 1 of every brief, then rep 2 of every brief, and so on, so a capped
  // run leaves its skips spread across briefs.
  const queue = Array.from({ length: args.k }, (_, i) =>
    briefs.map((brief) => ({ brief, rep: i + 1 }))
  ).flat();
  const reps: RepResult[] = new Array(queue.length);
  // Spend so far, in-flight reps' finished attempts included: the budget is
  // state every rep shares.
  let spent = 0;
  let next = 0;
  const worker = async () => {
    while (next < queue.length) {
      const index = next++;
      const { brief, rep } = queue[index]!;
      // At the budget no new rep starts; those in flight finish.
      if (args.budget !== null && spent >= args.budget) {
        reps[index] = skipped(brief, rep);
      } else {
        const workDir = join(runDir, `${brief.slug}-${rep}`);
        reps[index] = await runRep(deps, brief, rep, workDir, (cost) => {
          spent += cost;
        });
      }
      log(repLine(reps[index]));
    }
  };
  await Promise.all(Array.from({ length: concurrency }, worker));

  const file: ResultsFile = {
    runId,
    startedAt: started.toISOString(),
    finishedAt: now().toISOString(),
    versions: {
      ...versions,
      gitSha: git.sha,
      dirty: git.dirty,
      label: args.label,
    },
    briefs: args.briefs,
    k: args.k,
    budget: args.budget,
    concurrency,
    briefSlugs: briefs.map((brief) => brief.slug),
    totals: tally(reps),
    perBrief: Object.fromEntries(
      briefs.map((brief) => [
        brief.slug,
        tally(reps.filter((rep) => rep.brief === brief.slug)),
      ])
    ),
    reps,
  };
  mkdirSync(resultsDir, { recursive: true });
  writeFileSync(out, JSON.stringify(file, null, 2) + "\n");
  log(`results: ${relative(repo, out)}`);
  return 0;
}

async function runRep(
  deps: EvalDeps,
  brief: ScreenBrief,
  rep: number,
  workDir: string,
  spend: (cost: number) => void
): Promise<RepResult> {
  const attempts: AttemptResult[] = [];
  const started = performance.now();
  const base = { brief: brief.slug, rep, workDir: relative(repo, workDir) };
  let trace: RepTrace;
  try {
    trace = await deps.generate(brief, {
      workDir,
      onAttempt: (attempt) => {
        attempts.push(attempt);
        spend(attempt.cost);
      },
    });
  } catch (error) {
    console.error(error);
    return {
      ...base,
      outcome: "error",
      endReason: "error:crash",
      firstAttempt: false,
      criteria: null,
      cost: sum(attempts),
      wallMs: performance.now() - started,
      attempts,
    };
  }
  const wallMs = performance.now() - started;
  const criteria = checkPassCriteria(brief.requires, trace.uiSpec);
  const passed = trace.outcome === "pass" && criteria.met;
  return {
    ...base,
    outcome: trace.outcome === "pass" && !criteria.met ? "fail" : trace.outcome,
    endReason:
      trace.outcome === "pass" && !criteria.met
        ? "criteria-not-met"
        : trace.endReason,
    firstAttempt: passed && attempts.every((attempt) => attempt.attempt === 1),
    criteria,
    cost: sum(attempts),
    wallMs,
    attempts,
  };
}

// The median cost of the reps that ran in the results file that started
// last, or null if there's none. A skipped rep cost nothing and says nothing
// about what a rep costs.
function latestMedianRepCost(resultsDir: string): number | null {
  const costs = (latestResults(resultsDir)?.file.reps ?? [])
    .filter((rep) => rep.outcome !== "skipped")
    .map((rep) => rep.cost)
    .sort((a, b) => a - b);
  if (costs.length === 0) return null;
  const middle = Math.floor(costs.length / 2);
  return costs.length % 2
    ? costs[middle]!
    : (costs[middle - 1]! + costs[middle]!) / 2;
}

function skipped(brief: ScreenBrief, rep: number): RepResult {
  return {
    brief: brief.slug,
    rep,
    outcome: "skipped",
    endReason: "skipped:budget",
    firstAttempt: false,
    criteria: null,
    cost: 0,
    wallMs: 0,
    workDir: null,
    attempts: [],
  };
}

type Args = {
  briefs: string;
  k: number;
  budget: number | null;
  label: string;
  allowDirty: boolean;
};

function parse(argv: string[]): Args | string {
  let values;
  try {
    ({ values } = parseArgs({
      args: argv,
      options: {
        briefs: { type: "string", default: "evals/briefs/*.md" },
        k: { type: "string", default: "3" },
        budget: { type: "string", default: "15" },
        label: { type: "string", default: "eval" },
        "allow-dirty": { type: "boolean", default: false },
      },
    }));
  } catch (error) {
    return (error as Error).message;
  }
  const k = Number(values.k);
  if (!Number.isInteger(k) || k < 1)
    return `--k must be a whole number of reps: ${values.k}`;
  const budget = values.budget === "none" ? null : Number(values.budget);
  if (budget !== null && !(budget >= 0))
    return `--budget must be dollars or none: ${values.budget}`;
  // It names the results file and the run's scratch folder.
  if (!/^[a-z0-9][a-z0-9-]*$/.test(values.label))
    return `--label must be lower-case letters, digits and hyphens: ${values.label}`;
  return {
    briefs: values.briefs,
    k,
    budget,
    label: values.label,
    allowDirty: values["allow-dirty"],
  };
}

function sum(attempts: AttemptResult[]) {
  return attempts.reduce((total, attempt) => total + attempt.cost, 0);
}

function repLine(rep: RepResult) {
  return `${rep.brief} · rep ${rep.rep} · ${rep.outcome} · ${rep.endReason} · ${dollars(rep.cost)} · ${(rep.wallMs / 1000).toFixed(1)}s`;
}

function dollars(usd: number) {
  return `$${usd.toFixed(2)}`;
}

const pad = (n: number) => String(n).padStart(2, "0");

// Local date, YYYY-MM-DD.
function day(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

// Local time, YYYYMMDD-HHMMSS.
function stamp(date: Date) {
  return (
    `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}-` +
    `${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`
  );
}
