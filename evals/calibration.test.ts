// @vitest-environment node
// The calibration set (ADR 0014): every kept screen as it is, and hand-broken
// copies of them, each against one brief-conformance criterion. No test
// calls the live judge.

import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type Anthropic from "@anthropic-ai/sdk";
import { afterEach, describe, expect, it } from "vitest";
import {
  calibrationSet,
  main,
  type CalibrateDeps,
  type SetScreen,
} from "./calibration.ts";
import type { Criterion } from "../generator/conformance.ts";
import type { Model } from "../generator/model.ts";
import { repo } from "../repo.ts";

// A judge reply as the Messages API returns one (generator/fixtures), every
// reason quoting the design brief but those `unquoted`, with its verdicts
// set: `fails` fail and the rest pass.
const recorded: Anthropic.Message = JSON.parse(
  readFileSync(join(repo, "generator/fixtures/judge-reply.json"), "utf8")
);
function reply(
  fails: Criterion[],
  unquoted: Criterion[] = []
): Anthropic.Message {
  const block = recorded.content.find((each) => each.type === "text")!;
  const verdicts = JSON.parse(block.text) as Record<
    Criterion,
    { reason: string; pass: boolean }
  >;
  for (const [criterion, verdict] of Object.entries(verdicts)) {
    verdict.pass = !fails.includes(criterion as Criterion);
    if (unquoted.includes(criterion as Criterion))
      verdict.reason = `The screen meets ${criterion}.`;
  }
  return {
    ...recorded,
    content: [
      recorded.content[0]!,
      { ...block, text: JSON.stringify(verdicts) },
    ],
  };
}

// Each state's screenshot names its screen and state, so the judge below
// knows what it's looking at.
const shotOf = (id: string, state: string) => Buffer.from(`${id}|${state}`);

// A judge that answers each screen state by `verdict(id, state, run)`, the
// run counted from how often that state was judged before; and a render
// pass that renders every state of a screen. Both keep what they were sent.
function recording(
  verdict: (
    id: string,
    state: string,
    run: number
  ) => Criterion[] | "throw" | { unquoted: Criterion[] }
) {
  const seen = new Map<string, number>();
  const calls: string[] = [];
  const judge: Model = async (params) => {
    const [image] = params.messages[0]!.content as Anthropic.ImageBlockParam[];
    const key = Buffer.from(
      (image!.source as Anthropic.Base64ImageSource).data,
      "base64"
    ).toString();
    const run = (seen.get(key) ?? 0) + 1;
    seen.set(key, run);
    calls.push(`judge ${key}`);
    const [id, state] = key.split("|") as [string, string];
    const fails = verdict(id, state, run);
    if (fails === "throw") throw new Error("overloaded");
    const message = Array.isArray(fails)
      ? reply(fails)
      : reply([], fails.unquoted);
    return { message, requestId: "req_recorded" };
  };
  const render = async (screen: SetScreen) => {
    calls.push(`render ${screen.id}`);
    return screen.states.map((state) => ({
      state,
      png: shotOf(screen.id, state),
    }));
  };
  return { judge, render, calls };
}

const dirs: string[] = [];
afterEach(() => {
  for (const dir of dirs.splice(0))
    rmSync(dir, { recursive: true, force: true });
});

function deps(
  verdict: Parameters<typeof recording>[0],
  overrides: Partial<CalibrateDeps> = {}
) {
  const { judge, render, calls } = recording(verdict);
  const lines: string[] = [];
  const dir = mkdtempSync(join(tmpdir(), "calibration-"));
  dirs.push(dir);
  return {
    calls,
    lines,
    out: join(dir, "report.md"),
    deps: {
      judge,
      render,
      confirm: async () => {
        calls.push("confirm");
        return true;
      },
      git: async () => ({ sha: "abc1234def", dirty: false }),
      log: (line: string) => {
        lines.push(line);
        calls.push(`log ${line}`);
      },
      now: () => new Date(2026, 9, 29, 12, 0, 0),
      ...overrides,
    } satisfies CalibrateDeps,
  };
}

// The calibration run the report below comes from: every kept screen passes
// and every copy fails the criterion it breaks in its default state, on
// every run, but for two verdicts. On run 2 the judge misses bulk-pay--copy's
// headline, and on run 3 it fails my-invoices' density in its empty state.
// Both are wrong, and both flipped.
const scripted = (id: string, state: string, run: number): Criterion[] => {
  if (id === "bulk-pay--copy" && run === 2) return [];
  if (id === "my-invoices" && state === "empty" && run === 3)
    return ["density"];
  const breaks = id.split("--")[1] as Criterion | undefined;
  return breaks && state === "default" ? [breaks] : [];
};

describe("pnpm evals:calibrate", () => {
  it("judges every screen in the set three times and reports right verdicts and flips, overall and per criterion", async () => {
    const run = deps(scripted);

    const code = await main(["--out", run.out], run.deps);

    expect(code).toBe(0);
    const report = readFileSync(run.out, "utf8");
    // Overall and per criterion: 8 screens × 3 runs per criterion, and 8
    // screens' verdicts that can flip.
    expect(report).toMatch(
      /\| hierarchy +\| 24\/24 \(100%\) +\| 0\/8 \(0%\) +\|/
    );
    expect(report).toMatch(
      /\| density +\| 23\/24 \(96%\) +\| 1\/8 \(13%\) +\|/
    );
    expect(report).toMatch(/\| accent +\| 24\/24 \(100%\) +\| 0\/8 \(0%\) +\|/);
    expect(report).toMatch(
      /\| elevation +\| 24\/24 \(100%\) +\| 0\/8 \(0%\) +\|/
    );
    expect(report).toMatch(/\| copy +\| 23\/24 \(96%\) +\| 1\/8 \(13%\) +\|/);
    expect(report).toMatch(
      /\| repetition +\| 24\/24 \(100%\) +\| 0\/8 \(0%\) +\|/
    );
    expect(report).toMatch(
      /\| \*\*All\*\* +\| 142\/144 \(99%\) +\| 2\/48 \(4%\) +\|/
    );
    // Each screen and criterion: the expected verdict, then each run's.
    expect(report).toContain("## bulk-pay--copy");
    expect(report).toContain(
      "Breaks copy: The title says Streamline your payroll, not Pay invoices."
    );
    expect(report).toMatch(/\| copy +\| fail +\| fail +\| pass +\| fail +\|/);
    expect(report).toMatch(
      /## my-invoices\n[\s\S]*?\| density +\| pass +\| pass +\| pass +\| fail +\|/
    );
    // And its reasons: a failing verdict's from each state that failed it.
    expect(report).toContain(
      '- density · run 3 · fail · empty: Text, padding and the 44px button give the contractor the room the brief asks for: "Contractor screens have room."'
    );
    expect(report).toContain(
      '- density · run 1 · pass · default: Text, padding and the 44px button give the contractor the room the brief asks for: "Contractor screens have room."'
    );
    // What ran: 33 screen states, each judged three times.
    expect(run.calls.filter((call) => call.startsWith("judge"))).toHaveLength(
      99
    );
    expect(report).toContain("abc1234");
    expect(report).toContain("claude-opus-5-5");
    expect(run.lines.at(-2)).toBe(
      "right verdicts: 142/144 (99%) · flipped: 2/48 (4%) · cost $2.52"
    );
    expect(run.lines.at(-1)).toBe(`wrote ${run.out}`);
  });

  it("prints a cost estimate before it renders or judges anything", async () => {
    const run = deps(scripted);

    await main(["--out", run.out], run.deps);

    const first = run.calls.findIndex(
      (call) => call.startsWith("render") || call.startsWith("judge")
    );
    const estimate = run.calls.findIndex((call) =>
      call.startsWith("log estimate:")
    );
    expect(estimate).toBeGreaterThanOrEqual(0);
    expect(estimate).toBeLessThan(first);
    // Eval runs' nominal judge call: 33 × 3 × $0.069 = $6.83.
    expect(run.calls[estimate]).toBe(
      "log estimate: $6.83 (8 screens, 33 screen states × 3 runs × $0.069 a nominal judge call), budget $10.00"
    );
  });

  it("stops before spending anything when the estimate is over budget and the answer is no", async () => {
    const run = deps(scripted, { confirm: async () => false });

    const code = await main(["--out", run.out, "--budget", "0.5"], run.deps);

    expect(code).toBe(1);
    expect(
      run.calls.filter(
        (call) => call.startsWith("render") || call.startsWith("judge")
      )
    ).toEqual([]);
    expect(run.lines.at(-1)).toBe("Not run.");
    expect(existsSync(run.out)).toBe(false);
  });

  it("with --estimate prints the estimate and stops, over budget too", async () => {
    const run = deps(scripted);

    const code = await main(
      ["--out", run.out, "--budget", "0.5", "--estimate"],
      run.deps
    );

    expect(code).toBe(0);
    expect(run.calls).toEqual([
      "log estimate: $6.83 (8 screens, 33 screen states × 3 runs × $0.069 a nominal judge call), budget $0.50",
    ]);
    expect(existsSync(run.out)).toBe(false);
  });

  // A screen state the judge couldn't answer leaves that run's verdicts
  // undecided where no other state failed them, and out of the rates.
  it("leaves a verdict out of the rates when the judge couldn't answer for it", async () => {
    const run = deps((id, state, n) =>
      id === "payment-status" && state === "empty" && n === 1
        ? "throw"
        : scripted(id, state, n)
    );

    await main(["--out", run.out], run.deps);

    const report = readFileSync(run.out, "utf8");
    expect(report).toMatch(
      /## payment-status\n[\s\S]*?\| hierarchy +\| pass +\| undecided +\| pass +\| pass +\|/
    );
    expect(report).toMatch(
      /\| \*\*All\*\* +\| 136\/138 \(99%\) +\| 2\/48 \(4%\) +\|/
    );
    expect(report).toContain("6 verdicts undecided");
  });

  // A reason that quotes nothing in the brief costs only its criterion's
  // verdict, and the report says why.
  it("leaves only the misquoted criterion undecided, with its reason", async () => {
    const run = deps((id, state, n) =>
      id === "payment-status" && state === "empty" && n === 1
        ? { unquoted: ["copy"] }
        : scripted(id, state, n)
    );

    await main(["--out", run.out], run.deps);

    const report = readFileSync(run.out, "utf8");
    expect(report).toMatch(
      /## payment-status\n[\s\S]*?\| hierarchy +\| pass +\| pass +\| pass +\| pass +\|/
    );
    expect(report).toMatch(
      /## payment-status\n[\s\S]*?\| copy +\| pass +\| undecided +\| pass +\| pass +\|/
    );
    expect(report).toContain(
      "- copy · run 1 · undecided · empty: unquoted: The screen meets copy."
    );
    expect(report).toMatch(
      /\| \*\*All\*\* +\| 141\/143 \(99%\) +\| 2\/48 \(4%\) +\|/
    );
    expect(report).toContain("1 verdict undecided");
  });
});

describe("calibrationSet", () => {
  it("holds every kept screen as it is, then each broken copy and the criterion it breaks", () => {
    const set = calibrationSet();

    expect(set.map(({ id, kept, breaks }) => [id, kept, breaks])).toEqual([
      ["bulk-pay", "bulk-pay", null],
      ["my-invoices", "my-invoices", null],
      ["payment-status", "payment-status", null],
      ["payment-status--accent", "payment-status", "accent"],
      ["payment-status--elevation", "payment-status", "elevation"],
      ["bulk-pay--copy", "bulk-pay", "copy"],
      ["bulk-pay--density", "bulk-pay", "density"],
      ["my-invoices--hierarchy", "my-invoices", "hierarchy"],
    ]);
    for (const screen of set.filter(({ breaks }) => breaks === null)) {
      expect(screen.source).toBe(
        readFileSync(
          join(repo, "src/screens", screen.kept, `${screen.name}.tsx`),
          "utf8"
        )
      );
    }
  });

  it("renders each broken copy with its kept screen's stories, so in the same states", () => {
    const set = calibrationSet();
    const kept = new Map(
      set
        .filter(({ breaks }) => breaks === null)
        .map((screen) => [screen.kept, screen])
    );

    expect(kept.get("payment-status")!.states).toEqual([
      "default",
      "empty",
      "reminder-sent",
      "reminder-failed",
    ]);
    for (const copy of set.filter(({ breaks }) => breaks !== null)) {
      const original = kept.get(copy.kept)!;
      expect(copy.how).toEqual(expect.any(String));
      expect(copy.name).toBe(original.name);
      expect(copy.stories).toBe(original.stories);
      expect(copy.states).toEqual(original.states);
      expect(copy.brief).toEqual(original.brief);
      expect(copy.source).not.toBe(original.source);
    }
  });

  // `pnpm keep`'s tests write a screen folder, with no screen brief, for as
  // long as they run; a half-written one can have no stories yet.
  it("takes only kept screens with a committed screen brief", () => {
    const screens = mkdtempSync(join(tmpdir(), "calibration-screens-"));
    dirs.push(screens);
    for (const slug of ["bulk-pay", "my-invoices", "payment-status"]) {
      cpSync(join(repo, "src/screens", slug), join(screens, slug), {
        recursive: true,
      });
    }
    mkdirSync(join(screens, "keep-0a1b2c3d"));
    cpSync(
      join(repo, "src/screens/payment-status"),
      join(screens, "keep-4e5f6a7b"),
      { recursive: true }
    );

    const ids = calibrationSet(screens).map(({ id }) => id);

    expect(ids).toEqual(calibrationSet().map(({ id }) => id));
    expect(ids).not.toContain("keep-0a1b2c3d");
    expect(ids).not.toContain("keep-4e5f6a7b");
  });

  // Nothing Storybook, the gate, a baseline or a capture reads reaches a
  // copy: none is under src/, and none has stories of its own.
  it("keeps the broken copies out of the kept screens, and gives them no stories", () => {
    const copies = join(repo, "evals/calibration/screens");
    const ids = calibrationSet()
      .filter(({ breaks }) => breaks !== null)
      .map(({ id }) => id);

    expect(readdirSync(copies).sort()).toEqual([...ids].sort());
    for (const id of ids) {
      expect(
        readdirSync(join(copies, id)).filter((file) =>
          file.includes(".stories.")
        )
      ).toEqual([]);
    }
    expect(
      readdirSync(join(repo, "src/screens")).filter((slug) =>
        ids.includes(slug)
      )
    ).toEqual([]);
  });
});
