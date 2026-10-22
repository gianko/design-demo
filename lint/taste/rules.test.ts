// @vitest-environment node
// Every P0 taste rule says what RULES.md says, and credits impeccable where
// RULES.md's Origin column draws on it.

import { ESLint } from "eslint";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { renderRules } from "../../gates/render-rules.ts";

const repo = resolve(import.meta.dirname, "../..");
const rulesMd = readFileSync(resolve(import.meta.dirname, "RULES.md"), "utf8");

// A table row of RULES.md, by its first cell, as its cells.
function row(firstCell: string): string[] {
  const line = rulesMd
    .split("\n")
    .find((line) => line.startsWith(`| ${firstCell} |`));
  if (!line) throw new Error(`RULES.md has no row for ${firstCell}`);
  return line
    .slice(2, -2)
    .split(" | ")
    .map((cell) => cell.trim());
}

const staticRules = ["no-pill", "motion-tokens"];

describe.each(staticRules)("taste/%s's ESLint message", (rule) => {
  it("carries its RULES.md line", async () => {
    const [, , , , failsWhen, briefLine] = row(`\`${rule}\``);
    const eslint = new ESLint({ cwd: repo, ignore: false });
    const [result] = await eslint.lintFiles([
      resolve(import.meta.dirname, `fixtures/${rule}.fail.tsx`),
    ]);
    const message = result!.messages.find((m) => m.ruleId === `taste/${rule}`);
    expect(message?.message).toContain(failsWhen);
    expect(message?.message).toContain(briefLine);
  });
});

const renderRuleIds = [
  "no-pill",
  "type-on-scale",
  "tabular-numerals",
  "text-overflow",
];

it("gives gate 7 the render rules, each once", () => {
  expect(renderRules.map((rule) => rule.name).sort()).toEqual(
    [...renderRuleIds].sort()
  );
});

describe.each(renderRuleIds)("gate 7's %s", (rule) => {
  it("carries its RULES.md line", () => {
    const [, , , , failsWhen, briefLine] = row(`\`${rule}\``);
    const { help } = renderRules.find((r) => r.name === rule)!;
    expect(help).toContain(failsWhen);
    expect(help).toContain(briefLine);
  });
});

const p0Rules = [...new Set([...staticRules, ...renderRuleIds])];

// Impeccable's rules, by id, with the registry link RULES.md gives each.
const impeccable = new Map(
  [
    ...rulesMd.matchAll(
      /^\| \d+ \| \[`([a-z0-9-]+)`\]\((https:\/\/github\.com\/pbakaus\/impeccable\/[^)]+)\)/gm
    ),
  ].map(([, id, link]) => [id!, link!])
);

it("reads all 61 of impeccable's rules from RULES.md", () => {
  expect(impeccable.size).toBe(61);
});

describe.each(p0Rules)("lint/taste/rules/%s.ts", (rule) => {
  const [, , origin] = row(`\`${rule}\``);
  const named = [...origin!.matchAll(/`([a-z0-9-]+)`/g)]
    .map(([, id]) => id!)
    .filter((id) => impeccable.has(id));
  if (origin!.includes("impeccable") && named.length === 0) named.push(rule);
  const source = readFileSync(
    resolve(import.meta.dirname, `rules/${rule}.ts`),
    "utf8"
  );

  it.runIf(named.length > 0)(
    "credits impeccable, its licence and each rule it draws on",
    () => {
      expect(source).toMatch(/impeccable/);
      expect(source).toMatch(/Apache 2\.0/);
      for (const id of named) expect(source).toContain(impeccable.get(id));
    }
  );
});
