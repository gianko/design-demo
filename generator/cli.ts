// `pnpm generate <screen brief>` (spec § Generate CLI): one generate() rep
// that prints each attempt's gate results as they happen, writes the attempt
// folders to `.generated/<timestamp>-<slug>/`, and checks the screen brief's
// `requires.*` against the final UI spec. It ends with a table of every
// attempt, the rep's cost and its outcome with the end reason, and exits 0
// only on `passed` with the pass criteria met.

import { relative, resolve } from "node:path";
import { checkPassCriteria } from "./pass-criteria.ts";
import { type Attempt, generate } from "./generate.ts";
import type { Model } from "./model.ts";
import type { RenderPass } from "./render-gates.ts";
import { readScreenBrief } from "./screen-brief.ts";

const repo = resolve(import.meta.dirname, "..");

export type CliDeps = {
  model: Model;
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

  const criteria = checkPassCriteria(brief.requires, trace.uiSpec);
  log(
    criteria.met
      ? "pass criteria: met"
      : `pass criteria: not met${criteria.missing.length ? ` · missing ${criteria.missing.join(", ")}` : ""}`
  );
  log(attemptTable(trace.attempts));
  const total = trace.attempts.reduce((sum, { cost }) => sum + cost, 0);
  log(
    `cost: ${dollars(total)} over ${trace.attempts.length} attempt${trace.attempts.length === 1 ? "" : "s"}`
  );
  log(`outcome: ${trace.outcome} · end reason ${trace.endReason}`);
  return trace.endReason === "passed" && criteria.met ? 0 : 1;
}

// One row per attempt and one column per gate any attempt ran; a gate its
// step doesn't have reads `–`.
function attemptTable(attempts: Attempt[]) {
  const gates = [...new Set(attempts.flatMap((a) => Object.keys(a.gates)))];
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
      dollars(attempt.cost),
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

function dollars(usd: number) {
  return `$${usd.toFixed(4)}`;
}

function seconds(ms: number) {
  return `${(ms / 1000).toFixed(1)}s`;
}

function attemptLines(attempt: Attempt) {
  const gates = Object.entries(attempt.gates)
    .map(([gate, result]) => `${gate} ${result}`)
    .join(" · ");
  const head = `${attempt.step} · attempt ${attempt.attempt} · ${gates} · model ${seconds(attempt.wallMs.model)}, gates ${seconds(attempt.wallMs.gates)}`;
  // The render gates per theme × screen state (ADR 0008).
  const renders = (attempt.renders ?? []).map(
    ({ theme, state, density, gates: rendered }) =>
      `  ${theme} · ${state} · ${density} · ${Object.entries(rendered)
        .map(([gate, result]) => `${gate} ${result}`)
        .join(" · ")}`
  );
  return [
    head,
    ...renders,
    ...attempt.failures.map((line) => `  ${line}`),
  ].join("\n");
}

// Local time, YYYYMMDD-HHMMSS.
function stamp(date: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}-` +
    `${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`
  );
}
