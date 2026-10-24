// @vitest-environment node
// Every P0 taste rule runs where RULES.md says, says what RULES.md says, and
// credits impeccable where RULES.md's Origin column draws on it.

import { ESLint } from "eslint";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { renderRules } from "../../gates/render-rules.ts";
import { tasteConfigs } from "./plugin.ts";
import { ruleRows } from "./rules-md.ts";
import { repo } from "../../repo.ts";

const p0 = ruleRows().filter((row) => row.p0);
const staticRows = p0.filter((row) => row.check.includes("static"));
const renderRows = p0.filter((row) => row.check.includes("render"));

it("gives ESLint the static rules, each once", () => {
  const plugin = tasteConfigs.find((config) => config.plugins?.taste)!.plugins!
    .taste!;
  expect(Object.keys(plugin.rules!).sort()).toEqual(
    staticRows.map((row) => row.id).sort()
  );
});

describe.each(staticRows)("taste/$id's ESLint message", (row) => {
  it("carries its RULES.md line", async () => {
    const eslint = new ESLint({ cwd: repo, ignore: false });
    const [result] = await eslint.lintFiles([
      resolve(import.meta.dirname, `fixtures/${row.id}.fail.tsx`),
    ]);
    const message = result!.messages.find(
      (m) => m.ruleId === `taste/${row.id}`
    );
    expect(message?.message).toContain(row.failsWhen);
    expect(message?.message).toContain(`Design brief: ${row.designBriefLine}`);
  });
});

it("gives gate 7 the render rules, each once", () => {
  expect(renderRules.map((rule) => rule.name).sort()).toEqual(
    renderRows.map((row) => row.id).sort()
  );
});

describe.each(renderRows)("gate 7's $id", (row) => {
  it("carries its RULES.md line", () => {
    const { help } = renderRules.find((rule) => rule.name === row.id)!;
    expect(help).toContain(row.failsWhen);
    expect(help).toContain(`Design brief: ${row.designBriefLine}`);
  });
});

// Impeccable's rules, by id, with the registry link RULES.md gives each.
const impeccable = new Map(
  [
    ...readFileSync(resolve(import.meta.dirname, "RULES.md"), "utf8").matchAll(
      /^\| \d+ \| \[`([a-z0-9-]+)`\]\((https:\/\/github\.com\/pbakaus\/impeccable\/[^)]+)\)/gm
    ),
  ].map(([, id, link]) => [id!, link!])
);

it("reads all 61 of impeccable's rules from RULES.md", () => {
  expect(impeccable.size).toBe(61);
});

describe.each(p0)("lint/taste/rules/$id.ts", ({ id, origin }) => {
  const named = [...origin.matchAll(/`([a-z0-9-]+)`/g)]
    .map(([, id]) => id!)
    .filter((id) => impeccable.has(id));
  if (origin.includes("impeccable") && named.length === 0) named.push(id);
  const source = readFileSync(
    resolve(import.meta.dirname, `rules/${id}.ts`),
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
