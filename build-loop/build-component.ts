// `pnpm build-component <Component>`: one isolated, headless
// `/build-component` session (ADR 0006), launched by hand. `pnpm build-loop`
// launches the same session for each `build-loop` issue.

import { resolve } from "node:path";
import { parseArgs } from "node:util";
import { launch } from "./launch.ts";

const repo = resolve(import.meta.dirname, "..");

const { positionals } = parseArgs({ allowPositionals: true });
const [component] = positionals;
if (
  !component ||
  positionals.length > 1 ||
  !/^[A-Z][A-Za-z0-9]*$/.test(component)
) {
  fail(
    "Usage: pnpm build-component <Component>, e.g. pnpm build-component Screen"
  );
}

try {
  const session = launch(component, repo, console.log);
  console.log(`\n${session.summary}`);
  console.log(
    `\nContact sheet: ${resolve(session.worktree, "gates/out/contact-sheet/index.html")}`
  );
  process.exit(session.status);
} catch (error) {
  fail((error as Error).message);
}

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}
