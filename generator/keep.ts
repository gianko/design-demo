// `pnpm keep <.generated rep dir>` (spec § Keep): copies a passed rep's final
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
import { repo } from "../repo.ts";

export type KeepDeps = { log?: (line: string) => void };

export async function main(argv: string[], deps: KeepDeps = {}) {
  const log = deps.log ?? console.log;
  if (argv.length !== 1) {
    log("Usage: pnpm keep <.generated rep dir>");
    return 2;
  }
  const repDir = resolve(argv[0]!);
  const repFile = join(repDir, "rep.json");
  if (!existsSync(repFile)) {
    log(`${relative(repo, repDir)} isn't a rep dir: it has no rep.json.`);
    return 1;
  }
  const trace: RepTrace = JSON.parse(readFileSync(repFile, "utf8"));
  if (trace.endReason !== "passed" || !trace.screen || !trace.uiSpec) {
    log(`Only a passed rep is kept; this one ended ${trace.endReason}.`);
    return 1;
  }

  const dir = resolve(repo, "src/screens", trace.slug);
  if (existsSync(dir)) {
    log(
      `${relative(repo, dir)} is already kept. Remove it first to keep this rep instead.`
    );
    return 1;
  }
  // The rep dir may have moved since generate() wrote it, so the screen is
  // found from where the rep dir is now.
  const name = basename(trace.screen, ".tsx");
  const source = readFileSync(join(repDir, trace.screen), "utf8");
  const files = {
    [`${name}.tsx`]: source,
    [`${name}.stories.tsx`]: screenStories({
      slug: trace.slug,
      name,
      states: trace.uiSpec.states,
      nodes: trace.uiSpec.nodes,
      actions: trace.uiSpec.actions,
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
