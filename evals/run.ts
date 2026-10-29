// `pnpm evals` (ADR 0008): one eval run. Every screen brief `--briefs` matches
// runs K times through generate(), in-process, three reps at a time, each in
// its own scratch folder under `evals/runs/<run-id>/`. A rep ends as pass,
// fail, error or skipped; the brief's pass criteria are checked once, on the
// final UI spec. Gate 5 then judges the final screen (ADR 0014): soft, so its
// calls count toward the budget but its verdicts never touch the rep's
// outcome. The run writes one results file,
// `evals/results/<YYYY-MM-DD>-<label>.json`, with the version tuple, totals
// and every rep's attempts. A failing rep is data, so the run exits 0 once
// that file is written.

import { existsSync, globSync, mkdirSync, writeFileSync } from "node:fs";
import { basename, join, relative, resolve } from "node:path";
import { parseArgs } from "node:util";
import {
  judgeTrace,
  judgeVersions,
  nominalJudgeCall,
} from "../generator/conformance.ts";
import type { Attempt, RepTrace, Versions } from "../generator/generate.ts";
import type { Model } from "../generator/model.ts";
import { checkPassCriteria } from "../generator/pass-criteria.ts";
import {
  readScreenBrief,
  type ScreenBrief,
} from "../generator/screen-brief.ts";
import {
  type RepGate5,
  type RepResult,
  type ResultsFile,
  latestResults,
  tally,
} from "./results.ts";
import { day, dollars, stamp } from "../format.ts";
import { repo } from "../repo.ts";

export type EvalDeps = {
  // One rep: generate() with the model and render pass bound.
  generate: (
    brief: ScreenBrief,
    options: { workDir: string; onAttempt?: (attempt: Attempt) => void }
  ) => Promise<RepTrace>;
  // Gate 5's judge (ADR 0014).
  judge: Model;
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
  "Usage: pnpm evals [--briefs <glob>] [--k <n>] [--budget <usd>|none] [--label <label>] [--baseline <results file name>] [--allow-dirty] [--estimate]";

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

  // The Pages deploy compares this run against its baseline, so it has to
  // be a results file that's there.
  if (
    args.baseline !== null &&
    !existsSync(join(resultsDir, `${args.baseline}.json`))
  ) {
    log(
      `--baseline ${args.baseline}: there's no ${relative(repo, join(resultsDir, `${args.baseline}.json`))}.`
    );
    return 2;
  }

  // A results file names the commit it ran on, which a dirty tree isn't.
  const git = await deps.git();
  if (git.dirty && !args.allowDirty && !args.estimate) {
    log(
      "The tree has uncommitted changes, so the git SHA wouldn't say what ran. Commit them, or pass --allow-dirty to run anyway and record it."
    );
    return 2;
  }
  if (git.dirty && !args.estimate) log("dirty tree: allowed, and recorded");
  const versions = await deps.versions();

  // Screen briefs × K × the latest results file's median rep cost, which
  // takes in gate 5's calls once that file has them. One from before gate 5
  // adds a nominal judge call per screen state each rep judges. The Console
  // spend limit stays the backstop.
  const latest = latestRepCosts(resultsDir);
  if (latest === null) {
    log("estimate: none, no earlier results file");
  } else {
    const { median } = latest;
    const states = latest.gate5
      ? 0
      : args.k *
        briefs.reduce((sum, brief) => sum + latest.judgedStates(brief), 0);
    const judging = states * nominalJudgeCall;
    const estimate = briefs.length * args.k * median + judging;
    const line = `estimate: ${dollars(estimate)} (${briefs.length} screen brief${briefs.length === 1 ? "" : "s"} × ${args.k} reps × ${dollars(median)} median rep cost, ${latest.gate5 ? "gate 5 included" : `plus ${dollars(judging)} for gate 5: ${states} screen states × ${dollars(nominalJudgeCall, 3)} a nominal judge call`}), budget ${args.budget === null ? "none" : dollars(args.budget)}`;
    log(line);
    if (
      !args.estimate &&
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
  if (args.estimate) return 0;

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
      judge: judgeVersions(),
      gitSha: git.sha,
      dirty: git.dirty,
      label: args.label,
    },
    briefs: args.briefs,
    k: args.k,
    budget: args.budget,
    concurrency,
    briefSlugs: briefs.map((brief) => brief.slug),
    baseline: args.baseline,
    totals: tally(reps),
    perBrief: Object.fromEntries(
      briefs.map((brief) => [
        brief.slug,
        tally(reps.filter((rep) => rep.slug === brief.slug)),
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
  const attempts: Attempt[] = [];
  const started = performance.now();
  let ending: Ending;
  let trace: RepTrace | null = null;
  try {
    trace = await deps.generate(brief, {
      workDir,
      onAttempt: (attempt) => {
        attempts.push(attempt);
        spend(attempt.cost);
      },
    });
    const criteria = checkPassCriteria(brief.requires, trace.uiSpec);
    ending =
      trace.outcome === "pass" && !criteria.met
        ? { outcome: "fail", endReason: "criteria-not-met", criteria }
        : { outcome: trace.outcome, endReason: trace.endReason, criteria };
  } catch (error) {
    console.error(error);
    ending = { outcome: "error", endReason: "error:crash", criteria: null };
  }
  const gate5 =
    trace && ending.outcome !== "error"
      ? await judge(deps.judge, brief, trace, spend)
      : null;
  return repResult(brief, rep, ending, {
    wallMs: performance.now() - started,
    workDir: relative(repo, workDir),
    attempts,
    gate5,
  });
}

// Gate 5 on the rep's final screen (ADR 0014). Anything that stops the judge
// leaves it not run (judgeTrace); it never ends the rep, and never changes
// how it ended. Its calls spend toward the budget.
async function judge(
  model: Model,
  brief: ScreenBrief,
  trace: RepTrace,
  spend: (cost: number) => void
): Promise<RepGate5> {
  // The prompt hash is the run's, in its version tuple, so it's left out.
  const { ran, notRun, states, score, cost } = await judgeTrace(
    trace,
    brief,
    model
  );
  spend(cost);
  return { ran, notRun, states, score, cost };
}

function skipped(brief: ScreenBrief, rep: number): RepResult {
  return repResult(
    brief,
    rep,
    { outcome: "skipped", endReason: "skipped:budget", criteria: null },
    { wallMs: 0, workDir: null, attempts: [], gate5: null }
  );
}

// How a rep ended, and its pass criteria if it got as far as a UI spec.
type Ending = Pick<RepResult, "outcome" | "endReason" | "criteria">;

// A rep's result. Whether it passed first time follows from its ending and
// attempts; what it cost, from its attempts and gate 5.
function repResult(
  brief: ScreenBrief,
  rep: number,
  ending: Ending,
  ran: Pick<RepResult, "wallMs" | "workDir" | "attempts"> & {
    gate5: RepGate5 | null;
  }
): RepResult {
  return {
    slug: brief.slug,
    rep,
    ...ending,
    firstAttempt:
      ending.outcome === "pass" &&
      ran.attempts.every((attempt) => attempt.attempt === 1),
    cost:
      ran.attempts.reduce((total, attempt) => total + attempt.cost, 0) +
      (ran.gate5?.cost ?? 0),
    ...ran,
  };
}

// The median cost of the reps that ran in the results file that started
// last, whether those costs take in gate 5's, and how many screen states the
// judge will see for a screen brief; or null if there's none. A skipped rep
// cost nothing and says nothing about what a rep costs.
function latestRepCosts(
  resultsDir: string
): {
  median: number;
  gate5: boolean;
  judgedStates: (brief: ScreenBrief) => number;
} | null {
  const reps = latestResults(resultsDir)?.file.reps ?? [];
  const costs = reps
    .filter((rep) => rep.outcome !== "skipped")
    .map((rep) => rep.cost)
    .sort((a, b) => a - b);
  if (costs.length === 0) return null;
  const middle = Math.floor(costs.length / 2);
  const rendered = renderedStates(reps);
  return {
    median:
      costs.length % 2
        ? costs[middle]!
        : (costs[middle - 1]! + costs[middle]!) / 2,
    gate5: reps.some((rep) => rep.gate5 !== undefined),
    // The judge sees each light render, so the stories' states: the default,
    // each declared state, and the open-sheet and rows-ticked renders. A
    // screen brief the file rendered gives its own count; one it didn't, the
    // default and each state it requires.
    judgedStates: (brief) =>
      rendered.get(brief.slug) ?? 1 + brief.requires.states.length,
  };
}

// Per screen brief, the most light renders any rep's final code attempt
// had in a results file: the screen states gate 5 would have judged.
function renderedStates(reps: RepResult[]) {
  const counts = new Map<string, number>();
  for (const rep of reps) {
    const final = (rep.attempts ?? []).findLast(
      (attempt) => attempt.step === "code"
    );
    const states = new Set(
      (final?.renders ?? [])
        .filter(({ theme }) => theme === "light")
        .map(({ state }) => state)
    ).size;
    if (states > (counts.get(rep.slug) ?? 0)) {
      counts.set(rep.slug, states);
    }
  }
  return counts;
}

type Args = {
  briefs: string;
  k: number;
  budget: number | null;
  label: string;
  // A results file's name, less `.json`.
  baseline: string | null;
  allowDirty: boolean;
  // Print the estimate and stop: a look at the cost before deciding.
  estimate: boolean;
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
        baseline: { type: "string" },
        "allow-dirty": { type: "boolean", default: false },
        estimate: { type: "boolean", default: false },
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
    // A path to the file works too.
    baseline:
      values.baseline === undefined ? null : basename(values.baseline, ".json"),
    allowDirty: values["allow-dirty"],
    estimate: values.estimate,
  };
}

function repLine(rep: RepResult) {
  const line = `${rep.slug} · rep ${rep.rep} · ${rep.outcome} · ${rep.endReason} · ${dollars(rep.cost)} · ${(rep.wallMs / 1000).toFixed(1)}s`;
  if (!rep.gate5) return line;
  const { score, notRun } = rep.gate5;
  return `${line} · ${score ? `gate 5 ${score.passed}/${score.of}` : `gate 5 not run: ${notRun}`}`;
}
