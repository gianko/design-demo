// `pnpm eval`, against the real model and render pass. The API key comes
// from the gitignored .env (ADR 0003). Run by hand only: CI never calls the
// API (ADR 0009).

import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { stdin, stdout } from "node:process";
import { createInterface } from "node:readline/promises";
import { generate, generatorVersions } from "../../generator/generate.ts";
import { anthropicModel } from "../../generator/model.ts";
import { loadRegistry } from "../../generator/registry.ts";
import { main } from "../run.ts";
import { repo } from "../../repo.ts";

const env = resolve(repo, ".env");
if (existsSync(env)) process.loadEnvFile(env);

const git = (...args: string[]) =>
  execFileSync("git", args, { cwd: repo, encoding: "utf8" }).trim();

// One registry for the whole run, so every rep and the version tuple agree.
const registry = await loadRegistry();
const model = anthropicModel();

process.exitCode = await main(process.argv.slice(2), {
  generate: (brief, { workDir, onAttempt }) =>
    generate(brief, { workDir, model, registry, onAttempt }),
  // Gate 5 (ADR 0014): the same API key, its own model config.
  judge: model,
  versions: () => generatorVersions(registry),
  git: async () => ({
    sha: git("rev-parse", "HEAD"),
    dirty: git("status", "--porcelain") !== "",
  }),
  confirm: async (question) => {
    const prompt = createInterface({ input: stdin, output: stdout });
    const answer = await prompt.question(`${question} [y/N] `);
    prompt.close();
    return /^y(es)?$/i.test(answer.trim());
  },
});
