// The repo paths and pnpm scripts a skill names in backticks, checked against
// the repo, so a skill that runs unattended can't point at something that
// moved. A span counts as a path when its first segment is a top-level entry
// of the repo, which leaves out package imports and git refs; a span holding
// `$ARGUMENTS` names something the session creates.

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

// Paths that exist only once a run writes them, each with the file that
// decides where, and the text that file must contain.
export type Outputs = Record<string, readonly [file: string, text: string]>;

export function brokenReferences(
  skill: string,
  repo: string,
  outputs: Outputs
): string[] {
  const { scripts = {} } = JSON.parse(
    readFileSync(join(repo, "package.json"), "utf8")
  );
  const broken: string[] = [];
  for (const [, span] of skill.matchAll(/`([^`\n]+)`/g)) {
    const script = /^pnpm ([\w:-]+)/.exec(span!)?.[1];
    if (script) {
      if (!(script in scripts)) broken.push(`pnpm ${script}: no such script`);
      continue;
    }
    if (!/^[\w.-]+(\/[\w.*-]*)*$/.test(span!)) continue;
    const path = span!.replace(/\*$/, "");
    if (!existsSync(join(repo, path.split("/")[0]!))) continue;
    const output = outputs[path];
    if (output) {
      const [file, text] = output;
      if (!readFileSync(join(repo, file), "utf8").includes(text)) {
        broken.push(`${path}: ${file} doesn't mention ${text}`);
      }
    } else if (!existsSync(join(repo, path))) {
      broken.push(`${path}: no such path`);
    }
  }
  return broken;
}
