#!/usr/bin/env node
// PROTOTYPE gate runner for one component: `pnpm gate Button`.
// Runs gates 2 (+ static 7), 3, then 4/6/7 over the component's stories.
// Prints one summary; exit code 1 if any gate fails.
import { spawnSync } from "node:child_process";
import { readFileSync, existsSync, rmSync } from "node:fs";

const component = process.argv[2];
if (!component) { console.error("usage: pnpm gate <Component>"); process.exit(2); }
const dir = `src/components/${component}`;
const run = (cmd, args, env = {}) => spawnSync(cmd, args, { encoding: "utf8", env: { ...process.env, ...env } });
const results = [];
rmSync("gates-out", { recursive: true, force: true });

const lint = run("npx", ["eslint", dir]);
results.push({ gate: "2+7s token & taste lint (ESLint)", ok: lint.status === 0, detail: lint.stdout.trim() });

const tsc = run("npx", ["tsc", "--noEmit", "--pretty", "false"]);
results.push({ gate: "3 typecheck", ok: tsc.status === 0, detail: tsc.stdout.trim() });

const sb = run("npx", ["storybook", "build", "-o", "storybook-static", "--quiet"]);
if (sb.status !== 0) {
  results.push({ gate: "storybook build", ok: false, detail: (sb.stderr || sb.stdout).trim().split("\n").slice(-15).join("\n") });
} else {
  const pw = run("npx", ["playwright", "test", "--update-snapshots=missing"], { COMPONENT: component });
  let detail = "";
  if (existsSync("gates-out/playwright.json")) {
    const report = JSON.parse(readFileSync("gates-out/playwright.json", "utf8"));
    const lines = [];
    const walk = (s) => { for (const spec of s.specs ?? []) for (const t of spec.tests) for (const r of t.results) {
      if (r.status !== "passed") lines.push(`✗ ${spec.title}\n  ${(r.error?.message ?? "").replace(/\x1b\[[0-9;]*m/g, "").split("\n").map((l) => l.replace(/^Error: /, "")).filter((l) => l.startsWith("[gate") || /screenshot|baseline|pixels/i.test(l)).slice(0, 12).join("\n  ")}`);
      for (const a of r.attachments ?? []) if (a.name?.endsWith("-actual.png") && r.status !== "passed") lines.push(`  diff: ${a.path}`);
    } for (const c of s.suites ?? []) walk(c); };
    for (const s of report.suites) walk(s);
    detail = lines.join("\n");
  }
  results.push({ gate: "4/6/7r a11y, visual regression, render taste (Playwright)", ok: pw.status === 0, detail: detail || pw.stdout.trim().split("\n").slice(-20).join("\n") });
}

for (const r of results) {
  console.log(`${r.ok ? "PASS" : "FAIL"}  ${r.gate}`);
  if (!r.ok && r.detail) console.log(r.detail.replace(/^/gm, "      "));
}
console.log(`\nScreenshots for self-critique: gates-out/shots/ (one PNG per story × theme × density)`);
process.exit(results.every((r) => r.ok) ? 0 : 1);
