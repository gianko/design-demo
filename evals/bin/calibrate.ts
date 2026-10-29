// `pnpm eval:calibrate`, against the real judge and render pass (ADR 0014).
// The API key comes from the gitignored .env (ADR 0003). Run by hand only:
// CI never calls the API (ADR 0009).

import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { stdin, stdout } from "node:process";
import { createInterface } from "node:readline/promises";
import { anthropicModel } from "../../generator/model.ts";
import { main, renderSetScreen } from "../calibration.ts";
import { repo } from "../../repo.ts";

const env = resolve(repo, ".env");
if (existsSync(env)) process.loadEnvFile(env);

const git = (...args: string[]) =>
  execFileSync("git", args, { cwd: repo, encoding: "utf8" }).trim();

process.exitCode = await main(process.argv.slice(2), {
  render: renderSetScreen,
  judge: anthropicModel(),
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
