// Hand-written results files and eval-run scratch for the tests that run
// `pnpm eval:report` (report.test.ts, pages-deploy.test.ts). Each test's
// scratch folder is removed when it finishes.

import { randomUUID } from "node:crypto";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";
import { onTestFinished } from "vitest";
import type { Step } from "../generator/config.ts";
import { type Criterion, criteria } from "../generator/conformance.ts";
import type { Attempt } from "../generator/generate.ts";
import type { GateName } from "../generator/failure.ts";
import {
  type RepGate5,
  type RepOutcome,
  type RepResult,
  type ResultsFile,
  tally,
} from "./results.ts";
import { repo } from "../repo.ts";

// A scratch folder for one test: results files, eval-run scratch, reports.
export function setup() {
  const dir = join(repo, ".generated", `vitest-report-${randomUUID()}`);
  onTestFinished(() => rmSync(dir, { recursive: true, force: true }));
  mkdirSync(dir, { recursive: true });
  return {
    dir,
    resultsDir: join(dir, "results"),
    runsDir: join(dir, "runs"),
    reportsDir: join(dir, "reports"),
  };
}
export type At = ReturnType<typeof setup>;

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
              state: "payment-scheduled",
              gates: { "gate 4": "pass", "gate 7 render": "pass" },
            },
          ]
        : undefined,
  };
}

const ok = { met: true, missing: [] };

function rep(
  runId: string,
  slug: string,
  n: number,
  outcome: RepOutcome,
  wallSeconds: number,
  attempts: Attempt[],
  at: At
): RepResult {
  return {
    slug,
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
        : relative(repo, join(at.runsDir, runId, `${slug}-${n}`)),
    attempts,
  };
}

// The run every test starts from, K = 3:
// - invoice-queue passes first time, passes after a code repair, and fails
//   with its code attempts exhausted: 1/3 → 2/3.
// - payment-status passes first time twice, and once after a spec repair:
//   2/3 → 3/3.
// - any other screen brief it's given passes first time in all three reps.
export function runA(at: At, briefSlugs = ["invoice-queue", "payment-status"]) {
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
    ...briefSlugs
      .filter((slug) => !["invoice-queue", "payment-status"].includes(slug))
      .flatMap((slug) =>
        [1, 2, 3].map((n) =>
          rep(
            runId,
            slug,
            n,
            "pass",
            30,
            [attempt("spec", 1), attempt("code", 1)],
            at
          )
        )
      ),
  ].filter((each) => briefSlugs.includes(each.slug));
  return results(runId, "before", briefSlugs, reps);
}

// A later run where every rep of every brief passes first time.
export function runB(at: At, briefSlugs = ["invoice-queue", "payment-status"]) {
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
        tally(reps.filter((each) => each.slug === slug)),
      ])
    ),
    reps,
  };
}

// Gate 5 on one rep, at $0.05 a state: per screen state, the criteria its
// verdicts fail; every other verdict passes.
export function gate5(states: Record<string, Criterion[]>): RepGate5 {
  const judgements = Object.entries(states).map(([state, failing]) => ({
    state,
    call: {
      usage: { input: 1650, output: 900, cacheRead: 4300, cacheWrite: 0 },
      cost: 0.05,
      stopReason: "end_turn" as const,
      requestId: `req_judge_${state}`,
      wallMs: 9000,
    },
    judged: true as const,
    verdicts: criteria.map((criterion) => ({
      criterion,
      pass: !failing.includes(criterion),
      reason: `The ${state} state ${failing.includes(criterion) ? "breaks" : "meets"} ${criterion}, as "Every status tag carries its word."`,
    })),
    passed: criteria.length - failing.length,
  }));
  return {
    ran: true,
    notRun: null,
    states: judgements,
    score: {
      passed: judgements.reduce((sum, each) => sum + each.passed, 0),
      of: judgements.length * criteria.length,
    },
    cost: judgements.length * 0.05,
  };
}

// Gate 5 on a rep whose one judge call failed.
export const gate5NotRun: RepGate5 = {
  ran: false,
  notRun: "1 of 1 state unjudged",
  states: [{ state: "default", call: null, judged: false, error: "api" }],
  score: null,
  cost: 0,
};

// A results file as a run with gate 5 writes it: each rep that passed or
// failed judged as `judge` says, the others null, its cost in the rep's, and
// the judge in the version tuple.
export function judged(
  file: ResultsFile,
  judge: (rep: RepResult) => RepGate5
): ResultsFile {
  const reps = file.reps.map((each) => {
    const result =
      each.outcome === "pass" || each.outcome === "fail" ? judge(each) : null;
    return { ...each, gate5: result, cost: each.cost + (result?.cost ?? 0) };
  });
  return {
    ...file,
    versions: {
      ...file.versions,
      judge: {
        model: "claude-opus-5-5",
        effort: "high",
        maxTokens: 16000,
        promptHash: "j".repeat(64),
      },
    },
    totals: tally(reps),
    perBrief: Object.fromEntries(
      file.briefSlugs.map((slug) => [
        slug,
        tally(reps.filter((each) => each.slug === slug)),
      ])
    ),
    reps,
  };
}

export function write(at: At, name: string, file: ResultsFile) {
  mkdirSync(at.resultsDir, { recursive: true });
  const path = join(at.resultsDir, name);
  writeFileSync(path, JSON.stringify(file, null, 2));
  return relative(repo, path);
}

// A stand-in PNG whose bytes say which render it is.
export const png = (label: string) =>
  Buffer.from(`png ${label}`).toString("base64");

// One rep's scratch folder as generate() leaves it: per code attempt, the
// render pass's Storybook index and Playwright results, each render's
// screenshot attached as `rest` (gates/stories.spec.ts).
export function scratch(at: At, workDir: string, codeAttempts: number[]) {
  const dir = join(repo, workDir);
  mkdirSync(join(dir, "attempt-1-spec"), { recursive: true });
  writeFileSync(join(dir, "attempt-1-spec", "ui-spec.json"), "{}");
  for (const n of codeAttempts) {
    const render = join(dir, `attempt-${n}-code`, "render");
    const stories = {
      "screens-invoice-queue--default": "Default",
      "screens-invoice-queue--payment-scheduled": "PaymentScheduled",
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
