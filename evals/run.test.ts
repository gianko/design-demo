// @vitest-environment node
// `pnpm eval` with a stubbed generate() (ADR 0009: CI never calls the API).
// The stub's attempts are priced from their usage by the generator's own
// pricing table, as a real rep's are. Each test runs the runner against its
// own briefs, results folder and scratch folder.

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
import {
  cost,
  stepConfig,
  type Step,
  type Usage,
} from "../generator/config.ts";
import type {
  Attempt,
  EndReason,
  RepTrace,
  Versions,
} from "../generator/generate.ts";
import type { ScreenBrief } from "../generator/screen-brief.ts";
import type { UiSpec } from "../generator/ui-spec.ts";
import { type EvalDeps, main } from "./run.ts";
import type { ResultsFile } from "./results.ts";
import { repo } from "../repo.ts";

const versions: Versions = {
  registryHash: "r".repeat(64),
  specPromptHash: "s".repeat(64),
  codePromptHash: "c".repeat(64),
  spec: stepConfig.spec,
  code: stepConfig.code,
};

// A cheap call: $0.004 + $0.01 + $0.004 + $0.005 = $0.023 at Opus 5.5's
// prices.
const small: Usage = {
  input: 1000,
  output: 500,
  cacheRead: 20_000,
  cacheWrite: 1000,
};
// $0.6 of output alone.
const large: Usage = { input: 0, output: 30_000, cacheRead: 0, cacheWrite: 0 };

const briefText = (title: string) => `---
audience: contractor
requires:
  components: [Screen, Card]
  states: [empty]
  actions: [send-reminder]
---

# ${title}
`;

// A UI spec that meets the briefs' pass criteria, or misses a state.
function uiSpec({ missingState = false } = {}): UiSpec {
  const node = (id: string, component: string, parent: string | null) => ({
    id,
    component,
    parent,
    slot: parent ? "body" : null,
    props: [],
    when: [],
    action: null,
  });
  return {
    audience: "contractor",
    nodes: [node("screen", "Screen", null), node("card", "Card", "screen")],
    states: missingState ? [] : [{ name: "empty", fixture: "empty" }],
    actions: [
      {
        name: "send-reminder",
        operation: "sendReminder",
        pending: "card",
        to: { success: "empty", failure: "empty" },
      },
    ],
  };
}

// One stubbed attempt: its gates pass or fail, its usage is priced.
function attempt(
  step: Step,
  n: number,
  pass: boolean,
  usage: Usage = small
): Attempt {
  const gates =
    step === "spec"
      ? { "gate 1": pass ? "pass" : "fail" }
      : {
          "gate 2": "pass",
          "gate 3": pass ? "pass" : "fail",
          "gate 7 static": "pass",
          "gate 4": "pass",
          "gate 7 render": "pass",
        };
  return {
    step,
    attempt: n,
    gates: gates as Attempt["gates"],
    failures: pass ? [] : [`gate 3 · TS2322 · L4:7 · Type 'x' is wrong.`],
    usage,
    cost: cost(stepConfig[step].model, usage),
    stopReason: "end_turn",
    requestId: `req_${step}_${n}`,
    wallMs: { model: 1000, gates: 200 },
    promptHash:
      step === "spec" ? versions.specPromptHash : versions.codePromptHash,
    renders: [],
  };
}

// How one stubbed rep goes.
type Plan = {
  attempts: Attempt[];
  endReason: EndReason;
  uiSpec?: UiSpec;
  // generate() itself throws after its attempts: the harness crashed.
  crash?: boolean;
  // Settles only when this resolves, so a test can hold a rep in flight.
  hold?: Promise<void>;
  // Called once its attempts are logged, to let held reps settle.
  release?: () => void;
};

// A promise and the function that resolves it.
function latch() {
  let release!: () => void;
  const hold = new Promise<void>((resolve) => (release = resolve));
  return { hold, release };
}

const plans = {
  firstTry: (): Plan => ({
    attempts: [attempt("spec", 1, true), attempt("code", 1, true)],
    endReason: "passed",
    uiSpec: uiSpec(),
  }),
  repaired: (): Plan => ({
    attempts: [
      attempt("spec", 1, true),
      attempt("code", 1, false),
      attempt("code", 2, true),
    ],
    endReason: "passed",
    uiSpec: uiSpec(),
  }),
  exhausted: (): Plan => ({
    attempts: [
      attempt("spec", 1, true),
      attempt("code", 1, false),
      attempt("code", 2, false),
      attempt("code", 3, false),
    ],
    endReason: "code-attempts-exhausted",
    uiSpec: uiSpec(),
  }),
  // Every gate passes, but the UI spec misses a required state.
  criteriaUnmet: (): Plan => ({
    attempts: [attempt("spec", 1, true), attempt("code", 1, true)],
    endReason: "passed",
    uiSpec: uiSpec({ missingState: true }),
  }),
  apiError: (): Plan => ({
    attempts: [attempt("spec", 1, true), attempt("code", 1, true)],
    endReason: "error:api",
    uiSpec: uiSpec(),
  }),
  crash: (): Plan => ({
    attempts: [attempt("spec", 1, true)],
    endReason: "passed",
    crash: true,
  }),
  // A $0.6 spec attempt, then a $0.023 code attempt.
  costly: (release?: () => void): Plan => ({
    attempts: [attempt("spec", 1, true, large), attempt("code", 1, true)],
    endReason: "passed",
    uiSpec: uiSpec(),
    release,
  }),
  held: (hold: Promise<void>): Plan => ({ ...plans.firstTry(), hold }),
};

type Run = {
  dir: string;
  briefsGlob: string;
  resultsDir: string;
  runsDir: string;
};

const cleanup: string[] = [];
afterEach(() => {
  for (const path of cleanup.splice(0))
    rmSync(path, { recursive: true, force: true });
});

// A scratch folder for one test, with a screen brief per slug.
function setup(...slugs: string[]): Run {
  const dir = join(repo, ".generated", `vitest-eval-${randomUUID()}`);
  cleanup.push(dir);
  const briefs = join(dir, "briefs");
  mkdirSync(briefs, { recursive: true });
  for (const slug of slugs)
    writeFileSync(join(briefs, `${slug}.md`), briefText(slug));
  return {
    dir,
    briefsGlob: relative(repo, join(briefs, "*.md")),
    resultsDir: join(dir, "results"),
    runsDir: join(dir, "runs"),
  };
}

type Stub = {
  // Per slug, the plans of its reps in the order they start.
  plans: Record<string, Plan[]>;
  dirty?: boolean;
  confirm?: boolean;
};

async function run(at: Run, argv: string[], stub: Stub) {
  const lines: string[] = [];
  const questions: string[] = [];
  const started: { slug: string; workDir: string }[] = [];
  const deps: EvalDeps = {
    generate: async (brief: ScreenBrief, { workDir, onAttempt }) => {
      started.push({ slug: brief.slug, workDir });
      const plan = stub.plans[brief.slug]!.shift()!;
      await plan.hold;
      mkdirSync(workDir, { recursive: true });
      for (const each of plan.attempts) onAttempt?.(each);
      plan.release?.();
      if (plan.crash) throw new Error("harness crashed");
      const trace: RepTrace = {
        slug: brief.slug,
        workDir,
        versions,
        attempts: plan.attempts,
        outcome:
          plan.endReason === "passed"
            ? "pass"
            : plan.endReason.startsWith("error:")
              ? "error"
              : "fail",
        endReason: plan.endReason,
        ...(plan.uiSpec ? { uiSpec: plan.uiSpec } : {}),
      };
      return trace;
    },
    versions: async () => versions,
    git: async () => ({ sha: "a".repeat(40), dirty: stub.dirty ?? false }),
    confirm: async (question) => {
      questions.push(question);
      return stub.confirm ?? true;
    },
    log: (line) => lines.push(line),
    now: () => new Date(2026, 9, 26, 14, 5, 9),
    resultsDir: at.resultsDir,
    runsDir: at.runsDir,
  };
  const code = await main(["--briefs", at.briefsGlob, ...argv], deps);
  return { code, output: lines.join("\n"), questions, started };
}

// The run's results file: its local date and the default label.
function results(at: Run, name = "2026-10-26-eval.json"): ResultsFile {
  const path = join(at.resultsDir, name);
  expect(existsSync(path)).toBe(true);
  return JSON.parse(readFileSync(path, "utf8"));
}

describe("pnpm eval", () => {
  it("ends each rep as pass, fail or error, with the pass criteria checked on the final UI spec", async () => {
    const at = setup("alpha");

    const { code } = await run(at, ["--k", "6"], {
      plans: {
        alpha: [
          plans.firstTry(),
          plans.repaired(),
          plans.exhausted(),
          plans.criteriaUnmet(),
          plans.apiError(),
          plans.crash(),
        ],
      },
    });

    expect(code).toBe(0);
    const reps = results(at).reps;
    expect(
      reps.map(({ outcome, endReason }) => ({ outcome, endReason }))
    ).toEqual([
      { outcome: "pass", endReason: "passed" },
      { outcome: "pass", endReason: "passed" },
      { outcome: "fail", endReason: "code-attempts-exhausted" },
      { outcome: "fail", endReason: "criteria-not-met" },
      { outcome: "error", endReason: "error:api" },
      { outcome: "error", endReason: "error:crash" },
    ]);
    expect(reps[3]!.criteria).toEqual({ met: false, missing: ["state empty"] });
    expect(reps[0]!.criteria).toEqual({ met: true, missing: [] });
  });

  it("gives each screen brief a first-attempt and a final pass rate, leaving errors and skips out", async () => {
    const at = setup("alpha", "beta");

    const { code } = await run(at, ["--k", "4"], {
      plans: {
        alpha: [
          plans.firstTry(),
          plans.repaired(),
          plans.apiError(),
          plans.exhausted(),
        ],
        beta: [
          plans.firstTry(),
          plans.criteriaUnmet(),
          plans.firstTry(),
          plans.crash(),
        ],
      },
    });

    expect(code).toBe(0);
    const { perBrief, totals } = results(at);
    expect(perBrief.alpha).toMatchObject({
      reps: 4,
      pass: 2,
      fail: 1,
      error: 1,
      skipped: 0,
      firstAttempt: { passed: 1, of: 3 },
      final: { passed: 2, of: 3 },
    });
    expect(perBrief.beta).toMatchObject({
      reps: 4,
      pass: 2,
      fail: 1,
      error: 1,
      skipped: 0,
      firstAttempt: { passed: 2, of: 3 },
      final: { passed: 2, of: 3 },
    });
    expect(totals).toMatchObject({
      firstAttempt: { passed: 3, of: 6 },
      final: { passed: 4, of: 6 },
    });
  });

  it("starts no rep once spend reaches the budget, and lets the in-flight ones finish", async () => {
    const at = setup("alpha");
    const { hold, release } = latch();

    // Three reps start at once. The first spends $0.623, over the $0.5
    // budget, while the other two are still in flight.
    const { started } = await run(at, ["--k", "6", "--budget", "0.5"], {
      plans: {
        alpha: [
          plans.costly(release),
          plans.held(hold),
          plans.held(hold),
          plans.firstTry(),
          plans.firstTry(),
          plans.firstTry(),
        ],
      },
    });

    expect(started).toHaveLength(3);
    const { reps, perBrief, totals } = results(at);
    expect(reps.map((rep) => rep.outcome)).toEqual([
      "pass",
      "pass",
      "pass",
      "skipped",
      "skipped",
      "skipped",
    ]);
    expect(reps[5]).toMatchObject({
      endReason: "skipped:budget",
      workDir: null,
      attempts: [],
      cost: 0,
    });
    // The in-flight reps' spend counts too.
    expect(totals.cost).toBeCloseTo(0.623 + 2 * 0.046, 6);
    // Skips are left out of the pass rates.
    expect(perBrief.alpha).toMatchObject({
      skipped: 3,
      firstAttempt: { passed: 3, of: 3 },
      final: { passed: 3, of: 3 },
    });
  });

  it("never skips with --budget none", async () => {
    const at = setup("alpha");

    const { questions } = await run(at, ["--k", "6", "--budget", "none"], {
      plans: { alpha: Array.from({ length: 6 }, () => plans.costly()) },
    });

    const { reps, budget, totals } = results(at);
    expect(reps.map((rep) => rep.outcome)).toEqual(Array(6).fill("pass"));
    expect(budget).toBeNull();
    expect(totals.cost).toBeCloseTo(6 * 0.623, 6);
    expect(questions).toEqual([]);
  });

  it("writes a results file with the version tuple, what narrowed the run, and every rep's attempts, and gives each rep its own scratch folder", async () => {
    const at = setup("alpha", "beta");

    const { code, started } = await run(
      at,
      ["--k", "2", "--label", "first-run"],
      {
        plans: {
          alpha: [plans.repaired(), plans.firstTry()],
          beta: [plans.firstTry(), plans.firstTry()],
        },
      }
    );

    expect(code).toBe(0);
    const file = results(at, "2026-10-26-first-run.json");
    expect(file.versions).toEqual({
      registryHash: versions.registryHash,
      specPromptHash: versions.specPromptHash,
      codePromptHash: versions.codePromptHash,
      spec: {
        model: "claude-opus-5-5",
        effort: "medium",
        maxTokens: 32_000,
        attempts: 3,
      },
      code: {
        model: "claude-opus-5-5",
        effort: "high",
        maxTokens: 64_000,
        attempts: 3,
      },
      gitSha: "a".repeat(40),
      dirty: false,
      label: "first-run",
    });
    expect(file).toMatchObject({
      runId: "20261026-140509-first-run",
      briefs: at.briefsGlob,
      k: 2,
      budget: 15,
      briefSlugs: ["alpha", "beta"],
    });

    // Each rep in its own folder under evals/runs/<run-id>/.
    const runDir = join(at.runsDir, "20261026-140509-first-run");
    const folders = ["alpha-1", "beta-1", "alpha-2", "beta-2"];
    expect(started.map((rep) => rep.workDir)).toEqual(
      folders.map((folder) => join(runDir, folder))
    );
    expect(readdirSync(runDir).sort()).toEqual([...folders].sort());

    const rep = file.reps.find(
      (each) => each.slug === "alpha" && each.rep === 1
    )!;
    expect(rep).toMatchObject({
      outcome: "pass",
      endReason: "passed",
      firstAttempt: false,
      workDir: relative(repo, join(runDir, "alpha-1")),
    });
    // $0.023 an attempt.
    expect(rep.cost).toBeCloseTo(0.069, 6);
    expect(rep.wallMs).toBeGreaterThanOrEqual(0);
    expect(rep.attempts).toHaveLength(3);
    expect(rep.attempts[1]).toEqual({
      step: "code",
      attempt: 1,
      gates: {
        "gate 2": "pass",
        "gate 3": "fail",
        "gate 7 static": "pass",
        "gate 4": "pass",
        "gate 7 render": "pass",
      },
      failures: ["gate 3 · TS2322 · L4:7 · Type 'x' is wrong."],
      usage: small,
      cost: 0.023,
      stopReason: "end_turn",
      requestId: "req_code_1",
      wallMs: { model: 1000, gates: 200 },
      promptHash: versions.codePromptHash,
      renders: [],
    });
    expect(file.totals.cost).toBeCloseTo(0.069 + 3 * 0.046, 6);
  });

  it("never overwrites a results file", async () => {
    const at = setup("alpha");
    mkdirSync(at.resultsDir, { recursive: true });
    writeFileSync(join(at.resultsDir, "2026-10-26-eval.json"), "{}\n");

    const { code, started, output } = await run(at, ["--k", "1"], {
      plans: { alpha: [plans.firstTry()] },
    });

    expect(code).toBe(2);
    expect(output).toMatch(/2026-10-26-eval\.json already exists.*--label/);
    expect(started).toEqual([]);
    expect(
      readFileSync(join(at.resultsDir, "2026-10-26-eval.json"), "utf8")
    ).toBe("{}\n");
  });

  it("refuses a dirty tree without --allow-dirty", async () => {
    const at = setup("alpha");

    const { code, started, output } = await run(at, ["--k", "1"], {
      plans: { alpha: [plans.firstTry()] },
      dirty: true,
    });

    expect(code).toBe(2);
    expect(output).toMatch(/uncommitted changes.*--allow-dirty/);
    expect(started).toEqual([]);
    expect(existsSync(at.resultsDir)).toBe(false);
  });

  it("runs on a dirty tree with --allow-dirty, and records it", async () => {
    const at = setup("alpha");

    const { code } = await run(at, ["--k", "1", "--allow-dirty"], {
      plans: { alpha: [plans.firstTry()] },
      dirty: true,
    });

    expect(code).toBe(0);
    expect(results(at).versions.dirty).toBe(true);
  });

  it("records the results file --baseline names, and none without it", async () => {
    const at = setup("alpha");
    mkdirSync(at.resultsDir, { recursive: true });
    writeFileSync(
      join(at.resultsDir, "2026-10-26-rerun.json"),
      JSON.stringify({ startedAt: "2026-10-26T23:51:35.118Z", reps: [] })
    );

    const named = await run(
      at,
      ["--k", "1", "--label", "p1", "--baseline", "2026-10-26-rerun"],
      { plans: { alpha: [plans.firstTry()] } }
    );
    const plain = await run(at, ["--k", "1"], {
      plans: { alpha: [plans.firstTry()] },
    });

    expect(named.code).toBe(0);
    expect(results(at, "2026-10-26-p1.json").baseline).toBe("2026-10-26-rerun");
    expect(plain.code).toBe(0);
    expect(results(at).baseline).toBeNull();
  });

  it("refuses a --baseline that names no results file, before any rep starts", async () => {
    const at = setup("alpha");

    const { code, started, output } = await run(
      at,
      ["--k", "1", "--baseline", "2026-10-26-gone"],
      { plans: { alpha: [plans.firstTry()] } }
    );

    expect(code).toBe(2);
    expect(output).toMatch(/2026-10-26-gone\.json/);
    expect(started).toEqual([]);
    expect(existsSync(at.resultsDir)).toBe(false);
  });

  describe("the estimate", () => {
    // Two earlier runs on one day. The later one's reps that ran cost $0.1,
    // $0.5 and $0.9 (median $0.5); with its skipped rep counted the median
    // would be $0.3. The earlier one's cost $5 each. The later one sorts
    // first by name and is written first, so only its start time says it's
    // the latest: a runner that went by name or by write order would read $5.
    function earlierRuns(at: Run) {
      const file = (startedAt: string, reps: [string, number][]) =>
        JSON.stringify({
          startedAt,
          reps: reps.map(([outcome, cost]) => ({ outcome, cost })),
        });
      mkdirSync(at.resultsDir, { recursive: true });
      writeFileSync(
        join(at.resultsDir, "2026-10-20-afternoon.json"),
        file("2026-10-20T12:00:00.000Z", [
          ["pass", 0.1],
          ["fail", 0.9],
          ["error", 0.5],
          ["skipped", 0],
        ])
      );
      writeFileSync(
        join(at.resultsDir, "2026-10-20-morning.json"),
        file("2026-10-20T08:00:00.000Z", [
          ["pass", 5],
          ["pass", 5],
          ["pass", 5],
        ])
      );
    }
    const twoBriefs = () => ({
      alpha: Array.from({ length: 3 }, plans.firstTry),
      beta: Array.from({ length: 3 }, plans.firstTry),
    });

    it("is screen briefs × K × the latest results file's median rep cost, and over budget it asks, and a no stops the run", async () => {
      const at = setup("alpha", "beta");
      earlierRuns(at);

      const { code, questions, started, output } = await run(
        at,
        ["--budget", "2"],
        { plans: twoBriefs(), confirm: false }
      );

      expect(questions).toHaveLength(1);
      expect(questions[0]).toContain("$3.00");
      expect(output).toContain(
        "estimate: $3.00 (2 screen briefs × 3 reps × $0.50 median rep cost)"
      );
      expect(code).toBe(1);
      expect(started).toEqual([]);
      expect(readdirSync(at.resultsDir).sort()).toEqual([
        "2026-10-20-afternoon.json",
        "2026-10-20-morning.json",
      ]);
    });

    it("runs on a yes", async () => {
      const at = setup("alpha", "beta");
      earlierRuns(at);

      const { code, started } = await run(at, ["--budget", "2"], {
        plans: twoBriefs(),
        confirm: true,
      });

      expect(code).toBe(0);
      expect(started).toHaveLength(6);
    });

    it("doesn't ask when the estimate is within budget", async () => {
      const at = setup("alpha", "beta");
      earlierRuns(at);

      const { code, questions, output } = await run(at, ["--budget", "3.5"], {
        plans: twoBriefs(),
      });

      expect(output).toContain("$3.00");
      expect(questions).toEqual([]);
      expect(code).toBe(0);
    });
  });
});
