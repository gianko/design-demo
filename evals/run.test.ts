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
import type Anthropic from "@anthropic-ai/sdk";
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
import type { Model } from "../generator/model.ts";
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

// A judge reply as the Messages API returns one: its verdicts fail only
// repetition, at $0.02546 a call.
const recorded: Anthropic.Message = JSON.parse(
  readFileSync(join(repo, "generator/fixtures/judge-reply.json"), "utf8")
);

// The recorded reply with every verdict passing.
const allPass: Anthropic.Message = {
  ...recorded,
  content: [
    recorded.content[0]!,
    {
      ...(recorded.content[1] as Anthropic.TextBlock),
      text: (recorded.content[1] as Anthropic.TextBlock).text.replace(
        '"pass":false',
        '"pass":true'
      ),
    },
  ],
};

// A judge that answers every request with `reply`, keeping the requests.
function judging(
  reply: () => Anthropic.Message | Promise<Anthropic.Message> = () => recorded
) {
  const requests: Anthropic.MessageCreateParamsNonStreaming[] = [];
  const judge: Model = async (params) => {
    requests.push(params);
    return { message: await reply(), requestId: "req_judge" };
  };
  return { judge, requests };
}

// The bytes of the screenshot each request sent.
function sentShots(requests: Anthropic.MessageCreateParamsNonStreaming[]) {
  return requests.map((request) => {
    const [image] = request.messages[0]!
      .content as Anthropic.ContentBlockParam[];
    const { source } = image as Anthropic.ImageBlockParam;
    return source.type === "base64"
      ? Buffer.from(source.data, "base64").toString()
      : null;
  });
}

// How one stubbed rep goes.
type Plan = {
  attempts: Attempt[];
  endReason: EndReason;
  uiSpec?: UiSpec;
  // The screen states its final code attempt shot, each light and dark.
  shots?: string[];
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
  // Gate 5's judge; the recorded reply unless given.
  judge?: Model;
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
      const shotsDir = join("attempt-1-code", "render", "shots");
      const shots = (plan.shots ?? []).flatMap((state) =>
        (["light", "dark"] as const).map((theme) => {
          const file = join(shotsDir, `${theme}-${state}.png`);
          mkdirSync(join(workDir, shotsDir), { recursive: true });
          writeFileSync(join(workDir, file), `png ${theme} ${state}`);
          return { theme, state, file };
        })
      );
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
        ...(plan.shots ? { shots } : {}),
      };
      return trace;
    },
    judge: stub.judge ?? judging().judge,
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

  // ADR 0011's two structural patterns, checked on the final UI spec like
  // the other requires keys.
  describe("requires.transitions", () => {
    const transitionBrief = (transition: string) => `---
audience: admin
requires:
  components: [Screen]
  transitions: [${transition}]
---

# The \`${transition}\` transition
`;

    // An admin queue whose pay action sits in the table's actions footer and
    // ends in a Toast either way, and whose rows open a Sheet, or one without
    // either pattern: the Button sits in a Card, no state shows a Toast, and
    // the DataTable has no detail slot.
    function queueSpec({ patterns }: { patterns: boolean }): UiSpec {
      const node = (
        id: string,
        component: string,
        parent: string | null,
        slot: string | null,
        when: string[] = [],
        action: string | null = null
      ) => ({ id, component, parent, slot, props: [], when, action });
      return {
        audience: "admin",
        nodes: [
          node("screen", "Screen", null, null),
          node("table", "DataTable", "screen", "body"),
          node("number", "Text", "table", "cell"),
          ...(patterns
            ? [
                node("sheet", "Sheet", "table", "detail"),
                node("pay", "Button", "table", "actions", [], "pay"),
                {
                  ...node("done", "Toast", "screen", "body", [
                    "payment-scheduled",
                  ]),
                  props: [{ name: "tone", value: '"success"' }],
                },
                {
                  ...node("failed", "Toast", "screen", "body", [
                    "payment-failed",
                  ]),
                  props: [{ name: "tone", value: '"failure"' }],
                },
              ]
            : [
                node("card", "Card", "screen", "body"),
                node("pay", "Button", "card", "footer", [], "pay"),
              ]),
        ],
        states: [
          {
            name: "payment-scheduled",
            fixture: "invoice-queue/payment-scheduled",
          },
          { name: "payment-failed", fixture: "invoice-queue/payment-failed" },
        ],
        actions: [
          {
            name: "pay",
            operation: "payInvoices",
            pending: "pay",
            to: { success: "payment-scheduled", failure: "payment-failed" },
          },
        ],
      };
    }

    const passingWith = (uiSpec: UiSpec): Plan => ({
      ...plans.firstTry(),
      uiSpec,
    });

    it.each(["table-action-to-toast", "row-to-sheet"])(
      "fails a rep whose final UI spec lacks %s, and passes one that has it",
      async (transition) => {
        const at = setup();
        writeFileSync(
          join(at.dir, "briefs", "queue.md"),
          transitionBrief(transition)
        );

        await run(at, ["--k", "2"], {
          plans: {
            queue: [
              passingWith(queueSpec({ patterns: false })),
              passingWith(queueSpec({ patterns: true })),
            ],
          },
        });

        const reps = results(at).reps;
        expect(
          reps.map(({ outcome, endReason, criteria }) => ({
            outcome,
            endReason,
            criteria,
          }))
        ).toEqual([
          {
            outcome: "fail",
            endReason: "criteria-not-met",
            criteria: { met: false, missing: [`transition ${transition}`] },
          },
          {
            outcome: "pass",
            endReason: "passed",
            criteria: { met: true, missing: [] },
          },
        ]);
      }
    );
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
      // Gate 5's judge, and the rubric's and the design brief's hash.
      judge: {
        model: "claude-opus-5-5",
        effort: "high",
        maxTokens: 16_000,
        promptHash: expect.stringMatching(/^[0-9a-f]{64}$/),
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

  describe("gate 5", () => {
    it("judges each rep's final screen after its last attempt, and records each state's verdicts, reasons and score", async () => {
      const at = setup("alpha");
      const { judge, requests } = judging();

      const { code, output } = await run(at, ["--k", "1"], {
        plans: {
          alpha: [{ ...plans.repaired(), shots: ["default", "empty"] }],
        },
        judge,
      });

      expect(code).toBe(0);
      expect(output).toMatch(
        /^alpha · rep 1 · pass · passed · \$0\.12 · [\d.]+s · gate 5 5\/6$/m
      );
      // The light shot of each state, never the dark one.
      expect(sentShots(requests)).toEqual([
        "png light default",
        "png light empty",
      ]);
      const [rep] = results(at).reps;
      expect(rep!.gate5).toMatchObject({
        ran: true,
        notRun: null,
        score: { passed: 5, of: 6 },
      });
      expect(rep!.gate5!.states.map(({ state }) => state)).toEqual([
        "default",
        "empty",
      ]);
      const [first] = rep!.gate5!.states;
      if (!first!.judged) throw new Error("unjudged");
      expect(first!.verdicts.at(-1)).toEqual({
        criterion: "repetition",
        pass: false,
        reason:
          'The card says "Overdue" in its title, its status tag and its text, where the tag alone would do, since "Every status tag carries its word."',
      });
    });

    it("leaves each rep's outcome and the run's pass rates as they'd be without it, whatever the judge says", async () => {
      const at = setup("alpha");
      const failing = {
        ...recorded,
        content: [
          recorded.content[0]!,
          {
            ...(recorded.content[1] as Anthropic.TextBlock),
            text: (recorded.content[1] as Anthropic.TextBlock).text.replaceAll(
              '"pass":true',
              '"pass":false'
            ),
          },
        ],
      };

      await run(at, ["--k", "3"], {
        plans: {
          alpha: [
            { ...plans.firstTry(), shots: ["default"] },
            { ...plans.repaired(), shots: ["default"] },
            { ...plans.exhausted(), shots: ["default"] },
          ],
        },
        judge: judging(() => failing).judge,
      });

      const { reps, totals } = results(at);
      expect(reps.map((rep) => rep.gate5?.score)).toEqual([
        { passed: 0, of: 6 },
        { passed: 0, of: 6 },
        { passed: 0, of: 6 },
      ]);
      expect(
        reps.map(({ outcome, endReason, firstAttempt }) => ({
          outcome,
          endReason,
          firstAttempt,
        }))
      ).toEqual([
        { outcome: "pass", endReason: "passed", firstAttempt: true },
        { outcome: "pass", endReason: "passed", firstAttempt: false },
        {
          outcome: "fail",
          endReason: "code-attempts-exhausted",
          firstAttempt: false,
        },
      ]);
      expect(totals).toMatchObject({
        pass: 2,
        fail: 1,
        firstAttempt: { passed: 1, of: 3 },
        final: { passed: 2, of: 3 },
      });
    });

    it("totals a pass rate per criterion per screen brief, over the reps it judged: a rep passes a criterion when every state does", async () => {
      const at = setup("alpha", "beta");
      // Every verdict passes on the empty state; on the others, repetition
      // fails.
      const { judge } = judging();
      const byState: Model = async (params) =>
        sentShots([params])[0]!.endsWith("empty")
          ? { message: allPass, requestId: "req_judge" }
          : judge(params);

      await run(at, ["--k", "3"], {
        plans: {
          alpha: [
            { ...plans.firstTry(), shots: ["default", "empty"] },
            { ...plans.firstTry(), shots: ["empty"] },
            plans.firstTry(),
          ],
          beta: [
            { ...plans.firstTry(), shots: ["default"] },
            { ...plans.apiError(), shots: ["default"] },
            { ...plans.firstTry(), shots: ["default"] },
          ],
        },
        judge: byState,
      });

      const { perBrief, totals } = results(at);
      const rates = (repetition: [number, number], of: number) => ({
        hierarchy: { passed: of, of },
        density: { passed: of, of },
        accent: { passed: of, of },
        elevation: { passed: of, of },
        copy: { passed: of, of },
        repetition: { passed: repetition[0], of: repetition[1] },
      });
      expect(perBrief.alpha!.gate5).toEqual({
        judged: 2,
        notRun: 1,
        criteria: rates([1, 2], 2),
        score: { passed: 11, of: 12 },
        cost: expect.closeTo(3 * 0.02546, 6),
      });
      // The rep in error is left out, as it is from the pass rates.
      expect(perBrief.beta!.gate5).toEqual({
        judged: 2,
        notRun: 0,
        criteria: rates([0, 2], 2),
        score: { passed: 10, of: 12 },
        cost: expect.closeTo(2 * 0.02546, 6),
      });
      expect(totals.gate5).toMatchObject({
        judged: 4,
        notRun: 1,
        criteria: rates([1, 4], 4),
        score: { passed: 21, of: 24 },
      });
    });

    it("counts the judge's calls toward each rep's cost, the run's totals and the budget", async () => {
      const at = setup("alpha");
      const judged = () => ({
        ...plans.firstTry(),
        shots: ["default", "empty"],
      });

      // Three reps start at once and spend $0.138 on attempts, under the
      // $0.17 budget; each one's two judge calls take it over.
      await run(at, ["--k", "4", "--budget", "0.17"], {
        plans: { alpha: [judged(), judged(), judged(), plans.firstTry()] },
      });

      const { reps, totals } = results(at);
      expect(reps.map(({ outcome }) => outcome)).toEqual([
        "pass",
        "pass",
        "pass",
        "skipped",
      ]);
      // $0.046 of attempts and two calls at $0.02546.
      expect(reps[0]!.gate5!.cost).toBeCloseTo(0.05092, 6);
      expect(reps[0]!.cost).toBeCloseTo(0.09692, 6);
      expect(totals.cost).toBeCloseTo(3 * 0.09692, 6);
    });

    it("doesn't judge a rep that ended in error or was skipped", async () => {
      const at = setup("alpha");
      const { judge, requests } = judging();
      const { hold, release } = latch();

      // The first rep spends past the budget while the other two are in
      // flight, so the fourth is skipped.
      await run(at, ["--k", "4", "--budget", "0.5"], {
        plans: {
          alpha: [
            { ...plans.costly(release), shots: ["default"] },
            { ...plans.apiError(), hold, shots: ["default"] },
            { ...plans.crash(), hold, shots: ["default"] },
            { ...plans.firstTry(), shots: ["default"] },
          ],
        },
        judge,
      });

      const { reps } = results(at);
      expect(reps.map(({ outcome, gate5 }) => [outcome, gate5])).toEqual([
        ["pass", expect.objectContaining({ ran: true })],
        ["error", null],
        ["error", null],
        ["skipped", null],
      ]);
      expect(requests).toHaveLength(1);
    });

    it("shows as not run when the judge's call fails or the screen never rendered, and the rep ends as it would without it", async () => {
      const at = setup("alpha");

      await run(at, ["--k", "2"], {
        plans: {
          alpha: [
            { ...plans.firstTry(), shots: ["default"] },
            plans.firstTry(),
          ],
        },
        judge: judging(() => Promise.reject(new Error("overloaded"))).judge,
      });

      const { reps } = results(at);
      expect(reps.map(({ outcome }) => outcome)).toEqual(["pass", "pass"]);
      expect(reps[0]!.gate5).toMatchObject({
        ran: false,
        notRun: "1 of 1 state unjudged",
        score: null,
        states: [{ state: "default", judged: false, error: "api" }],
      });
      expect(reps[1]!.gate5).toEqual({
        ran: false,
        notRun: "no screenshots",
        states: [],
        score: null,
        cost: 0,
      });
    });
  });

  describe("the estimate", () => {
    // Two earlier runs on one day. The later one's reps that ran cost $0.1,
    // $0.5 and $0.9 (median $0.5); with its skipped rep counted the median
    // would be $0.3. The earlier one's cost $5 each. The later one sorts
    // first by name and is written first, so only its start time says it's
    // the latest: a runner that went by name or by write order would read $5.
    // Unless told otherwise, the later one judged its reps that passed or
    // failed with gate 5, and their costs include the judge's.
    function earlierRuns(at: Run, { gate5 = true } = {}) {
      const file = (startedAt: string, reps: [string, number][]) =>
        JSON.stringify({
          startedAt,
          reps: reps.map(([outcome, cost]) => ({
            outcome,
            cost,
            ...(gate5
              ? {
                  gate5:
                    outcome === "pass" || outcome === "fail"
                      ? { ran: true, cost: 0.05 }
                      : null,
                }
              : {}),
          })),
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
        "estimate: $3.00 (2 screen briefs × 3 reps × $0.50 median rep cost, gate 5 included)"
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

    // A results file from before gate 5 can't price the judge, so the
    // estimate adds a nominal call per screen state each rep judges: the
    // default and each state the screen brief requires.
    it("adds a nominal judge call per screen state when the latest results file has no gate 5", async () => {
      const at = setup("alpha", "beta");
      earlierRuns(at, { gate5: false });

      const { questions, output } = await run(at, ["--budget", "3.5"], {
        plans: twoBriefs(),
        confirm: false,
      });

      // 2 screen briefs × 3 reps × 2 states × $0.069 = $0.83.
      expect(output).toContain(
        "estimate: $3.83 (2 screen briefs × 3 reps × $0.50 median rep cost, plus $0.83 for gate 5: 12 screen states × $0.069 a nominal judge call)"
      );
      expect(questions).toHaveLength(1);
      expect(questions[0]).toContain("$3.83");
    });
  });
});
