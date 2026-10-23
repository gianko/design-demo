// `pnpm generate <screen brief>`, against the real model. The API key comes
// from the gitignored .env (ADR 0003).

import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { main } from "../cli.ts";
import { anthropicModel } from "../model.ts";

const env = resolve(import.meta.dirname, "../../.env");
if (existsSync(env)) process.loadEnvFile(env);

process.exitCode = await main(process.argv.slice(2), {
  model: anthropicModel(),
});
