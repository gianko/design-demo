// lint/taste/RULES.md is the source of every taste rule's help line, so the
// gate says what RULES.md says and the two can't drift.

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

export type RuleRow = {
  id: string;
  // The Ships cell is **P0** or **P1**: the rule is on.
  shipped: boolean;
  origin: string;
  // "static", "render" or "static + render".
  check: string;
  failsWhen: string;
  designBriefLine: string;
};

const rulesMd = resolve(import.meta.dirname, "RULES.md");

// The rows of RULES.md's "The 16 rules" table.
export function ruleRows(markdown = readFileSync(rulesMd, "utf8")): RuleRow[] {
  const section = markdown
    .split(/^## /m)
    .find((s) => s.startsWith("The 16 rules"));
  if (!section) throw new Error("RULES.md has no “The 16 rules” section.");
  return section
    .split("\n")
    .filter((line) => /^\| `[a-z-]+` \|/.test(line))
    .map((line) => {
      const cells = line
        .split(" | ")
        .map((cell) => cell.replace(/^\| |\s\|$/g, ""));
      const [id, ships, origin, check, failsWhen, designBriefLine] = cells;
      return {
        id: id!.replaceAll("`", ""),
        shipped: ships === "**P0**" || ships === "**P1**",
        origin: origin!,
        check: check!,
        failsWhen: failsWhen!,
        designBriefLine: designBriefLine!,
      };
    });
}

// A rule's help line: what fails, then the design brief line it enforces,
// both as RULES.md words them.
export function help(id: string): string {
  const row = ruleRows().find((row) => row.id === id);
  if (!row) throw new Error(`RULES.md has no rule \`${id}\`.`);
  return `${row.failsWhen} Design brief: ${row.designBriefLine}`;
}
