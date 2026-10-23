// `pnpm generate <screen brief>` (spec § Generate CLI): one generate() run
// that prints each attempt's gate results as they happen, writes the attempt
// folders to `.generated/<timestamp>-<slug>/`, and checks the screen brief's
// `requires.*` against the final UI spec. It exits 0 only on `passed` with
// the pass criteria met.

import { relative, resolve } from "node:path";
import { checkPassCriteria } from "./pass-criteria.ts";
import { type Attempt, generate } from "./generate.ts";
import type { Model } from "./model.ts";
import { readScreenBrief } from "./screen-brief.ts";

const repo = resolve(import.meta.dirname, "..");

export type CliDeps = {
  model: Model;
  log?: (line: string) => void;
  now?: () => Date;
  // Told the run dir before anything is written to it.
  onRunDir?: (dir: string) => void;
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
  deps.onRunDir?.(workDir);
  log(`run dir: ${relative(repo, workDir)}`);

  const trace = await generate(brief, {
    workDir,
    model: deps.model,
    onAttempt: (attempt) => log(attemptLines(attempt)),
  });

  const criteria = checkPassCriteria(brief.requires, trace.uiSpec);
  log(
    criteria.met
      ? "pass criteria: met"
      : `pass criteria: not met${criteria.missing.length ? ` · missing ${criteria.missing.join(", ")}` : ""}`
  );
  log(`outcome: ${trace.outcome}`);
  return trace.outcome === "passed" && criteria.met ? 0 : 1;
}

function attemptLines(attempt: Attempt) {
  const gates = Object.entries(attempt.gates)
    .map(([gate, result]) => `${gate} ${result}`)
    .join(" · ");
  const seconds = (ms: number) => `${(ms / 1000).toFixed(1)}s`;
  const head = `${attempt.step} · attempt ${attempt.attempt} · ${gates} · model ${seconds(attempt.wallMs.model)}, gates ${seconds(attempt.wallMs.gates)}`;
  return [head, ...attempt.failures.map((line) => `  ${line}`)].join("\n");
}

// Local time, YYYYMMDD-HHMMSS.
function stamp(date: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}-` +
    `${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`
  );
}
