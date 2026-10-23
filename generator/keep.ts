// `pnpm keep <.generated run dir>` (spec § Keep): copies a passed run's final
// TSX to `src/screens/<slug>/` and writes beside it the stories the render
// pass gated, one per declared screen state plus the default. From then on
// the kept screen is gated like a library component (ADR 0009); the human
// writes its baselines with `pnpm gate <slug> --update` and approves them on
// the PR.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, join, relative, resolve } from "node:path";
import { format, resolveConfig } from "prettier";
import type { RepTrace } from "./generate.ts";
import { screenStories } from "./screen-stories.ts";

const repo = resolve(import.meta.dirname, "..");

export type KeepDeps = { log?: (line: string) => void };

export async function main(argv: string[], deps: KeepDeps = {}) {
  const log = deps.log ?? console.log;
  if (argv.length !== 1) {
    log("Usage: pnpm keep <.generated run dir>");
    return 2;
  }
  const runDir = resolve(argv[0]!);
  const repFile = join(runDir, "rep.json");
  if (!existsSync(repFile)) {
    log(`${relative(repo, runDir)} isn't a run dir: it has no rep.json.`);
    return 1;
  }
  const trace: RepTrace = JSON.parse(readFileSync(repFile, "utf8"));
  if (trace.outcome !== "passed" || !trace.screen || !trace.uiSpec) {
    log(`Only a passed run is kept; this one ended ${trace.outcome}.`);
    return 1;
  }

  const dir = resolve(repo, "src/screens", trace.slug);
  if (existsSync(dir)) {
    log(
      `${relative(repo, dir)} is already kept. Remove it first to keep this run instead.`
    );
    return 1;
  }
  // The run dir may have moved since generate() wrote it, so the screen is
  // found from where the run dir is now.
  const name = basename(trace.screen, ".tsx");
  const source = readFileSync(join(runDir, trace.screen), "utf8");
  const files = {
    [`${name}.tsx`]: source,
    [`${name}.stories.tsx`]: screenStories({
      slug: trace.slug,
      name,
      states: trace.uiSpec.states,
    }),
  };
  mkdirSync(dir, { recursive: true });
  for (const [file, content] of Object.entries(files)) {
    const path = join(dir, file);
    const options = await resolveConfig(path);
    writeFileSync(path, await format(content, { ...options, filepath: path }));
    log(`kept ${relative(repo, path)}`);
  }
  log(
    `Next: pnpm gate ${trace.slug} --update writes its baselines, which the human approves on the PR.`
  );
  return 0;
}
