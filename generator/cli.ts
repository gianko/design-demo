// `pnpm generate <screen brief>` (spec § Generate CLI): one generate() rep
// that prints each attempt's gate results as they happen, writes the attempt
// folders to `.generated/<timestamp>-<slug>/`, and checks the screen brief's
// `requires.*` against the final UI spec. After the final attempt, gate 5
// (brief conformance, ADR 0014) judges the final screen's shots and prints
// its verdicts and score; it's soft, so nothing it says changes the outcome
// or the exit code. It ends with a table of every attempt, the rep's cost and
// its outcome with the end reason, and exits 0 only on `passed` with the
// pass criteria met.

import { writeFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import {
  type Conformance,
  criteria as rubricOrder,
  judgeScreen,
  screenshotsOf,
} from "./conformance.ts";
import { checkPassCriteria } from "./pass-criteria.ts";
import { type Attempt, generate, type RepTrace } from "./generate.ts";
import type { GateName } from "./failure.ts";
import type { Model } from "./model.ts";
import type { RenderPass } from "./render-gates.ts";
import { readScreenBrief, type ScreenBrief } from "./screen-brief.ts";
import { dollars, stamp } from "../format.ts";
import { repo } from "../repo.ts";

export type CliDeps = {
  model: Model;
  // Gate 5's judge; the generator's model unless a test stands in its own.
  judge?: Model;
  // generate()'s render pass; the real one unless a test stands in its own.
  render?: RenderPass;
  log?: (line: string) => void;
  now?: () => Date;
  // Told the rep dir before anything is written to it.
  onRepDir?: (dir: string) => void;
};

export async function main(argv: string[], deps: CliDeps): Promise<number> {
  const log = deps.log ?? console.log;
  if (argv.length !== 1) {
    log("Usage: pnpm generate <screen brief>");
    return 2;
  }
  const brief = readScreenBrief(resolve(argv[0]!));
  const workDir = resolve(
    repo,
    ".generated",
    `${stamp((deps.now ?? (() => new Date()))())}-${brief.slug}`
  );
  deps.onRepDir?.(workDir);
  log(`rep dir: ${relative(repo, workDir)}`);

  const trace = await generate(brief, {
    workDir,
    model: deps.model,
    render: deps.render,
    onAttempt: (attempt) => log(attemptLines(attempt)),
  });

  log(await gate5(trace, brief, deps.judge ?? deps.model));

  const criteria = checkPassCriteria(brief.requires, trace.uiSpec);
  log(
    criteria.met
      ? "pass criteria: met"
      : `pass criteria: not met${criteria.missing.length ? ` · missing ${criteria.missing.join(", ")}` : ""}`
  );
  log(attemptTable(trace.attempts));
  const total = trace.attempts.reduce((sum, { cost }) => sum + cost, 0);
  log(
    `cost: ${dollars(total, 4)} over ${trace.attempts.length} attempt${trace.attempts.length === 1 ? "" : "s"}`
  );
  log(`outcome: ${trace.outcome} · end reason ${trace.endReason}`);
  return trace.endReason === "passed" && criteria.met ? 0 : 1;
}

// One row per attempt and one column per gate any attempt ran; a gate its
// step doesn't have reads `–`.
function attemptTable(attempts: Attempt[]) {
  const gates = [
    ...new Set(attempts.flatMap((a) => Object.keys(a.gates) as GateName[])),
  ];
  const rows = [
    [
      "step",
      "attempt",
      ...gates,
      "stop",
      "input",
      "output",
      "cache read",
      "cache write",
      "cost",
      "model",
      "gates",
    ],
    ...attempts.map((attempt) => [
      attempt.step,
      String(attempt.attempt),
      ...gates.map((gate) => attempt.gates[gate] ?? "–"),
      attempt.stopReason ?? "–",
      String(attempt.usage.input),
      String(attempt.usage.output),
      String(attempt.usage.cacheRead),
      String(attempt.usage.cacheWrite),
      dollars(attempt.cost, 4),
      seconds(attempt.wallMs.model),
      seconds(attempt.wallMs.gates),
    ]),
  ];
  const widths = rows[0]!.map((_, i) =>
    Math.max(...rows.map((row) => row[i]!.length))
  );
  return rows
    .map((row) =>
      row
        .map((cell, i) => cell.padEnd(widths[i]!))
        .join("  ")
        .trimEnd()
    )
    .join("\n");
}

function seconds(ms: number) {
  return `${(ms / 1000).toFixed(1)}s`;
}

// `gate 2 pass · gate 3 fail`.
function gateResults(gates: Attempt["gates"]) {
  return Object.entries(gates)
    .map(([gate, result]) => `${gate} ${result}`)
    .join(" · ");
}

// Gate 5 on the final screen, kept in the rep dir as conformance.json. A rep
// that ended in error isn't judged, and anything that stops the judge leaves
// gate 5 not run: it never ends the rep.
async function gate5(trace: RepTrace, brief: ScreenBrief, judge: Model) {
  if (trace.outcome === "error") {
    return "gate 5 not run · the rep ended in error";
  }
  try {
    const screenshots = screenshotsOf(trace);
    if (screenshots.length === 0) return "gate 5 not run · no screenshots";
    const conformance = await judgeScreen({ brief, screenshots }, judge);
    writeFileSync(
      join(trace.workDir, "conformance.json"),
      JSON.stringify(conformance, null, 2) + "\n"
    );
    return conformanceLines(conformance);
  } catch (error) {
    console.error(error);
    return `gate 5 not run · ${error instanceof Error ? error.message : String(error)}`;
  }
}

// Each state's verdicts and score, then each failing verdict as a taste
// rule's finding reads: gate, state, criterion, reason. Then the screen's
// score, or why gate 5 didn't run.
function conformanceLines({ ran, states, score, cost }: Conformance) {
  const lines = states.flatMap((judgement) => {
    if (!judgement.judged) {
      return [`gate 5 · ${judgement.state} · not run · ${judgement.error}`];
    }
    const verdicts = judgement.verdicts
      .map(({ criterion, pass }) => `${criterion} ${pass ? "pass" : "fail"}`)
      .join(" · ");
    return [
      `gate 5 · ${judgement.state} · ${verdicts} · ${judgement.passed}/${rubricOrder.length}`,
      ...judgement.verdicts
        .filter(({ pass }) => !pass)
        .map(
          ({ criterion, reason }) =>
            `  gate 5 · ${judgement.state} · ${criterion} · ${reason}`
        ),
    ];
  });
  const plural = (n: number) => `${n} state${n === 1 ? "" : "s"}`;
  const unjudged = states.filter((judgement) => !judgement.judged).length;
  lines.push(
    ran && score
      ? `gate 5 score: ${score.passed}/${score.of} over ${plural(states.length)} · soft · ${dollars(cost, 4)}`
      : `gate 5 not run · ${unjudged} of ${plural(states.length)} unjudged`
  );
  return lines.join("\n");
}

function attemptLines(attempt: Attempt) {
  const head = `${attempt.step} · attempt ${attempt.attempt} · ${gateResults(attempt.gates)} · model ${seconds(attempt.wallMs.model)}, gates ${seconds(attempt.wallMs.gates)}`;
  // The render gates per theme × screen state (ADR 0008).
  const renders = (attempt.renders ?? []).map(
    ({ theme, state, density, gates }) =>
      `  ${theme} · ${state} · ${density} · ${gateResults(gates)}`
  );
  return [
    head,
    ...renders,
    ...attempt.failures.map((line) => `  ${line}`),
  ].join("\n");
}
