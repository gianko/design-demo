// PROTOTYPE (wayfinder #15): figma:sync-tokens generator.
// Reads the committed payload, writes one self-contained Plugin API script per
// collection (chunked) plus one for styles, each run verbatim through use_figma.
// Usage: node spikes/figma/sync.mjs [--dry-run] [--chunk=N] [--split]
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";

const here = (p) => new URL(p, import.meta.url);
const args = process.argv.slice(2);
const DRY_RUN = args.includes("--dry-run");
const CHUNK = Number(args.find((a) => a.startsWith("--chunk="))?.split("=")[1] ?? 100);
const payload = JSON.parse(readFileSync(here("out/payload.json"), "utf8"));
const varRuntime = readFileSync(here("sync-runtime.js"), "utf8");
const styleRuntime = readFileSync(here("styles-runtime.js"), "utf8");
const MAX = 50_000; // use_figma's `code` maxLength

const dir = here(`out/${DRY_RUN ? "dry-run" : "apply"}/`);
rmSync(dir, { recursive: true, force: true });
mkdirSync(dir, { recursive: true });

// Primitives first: Color aliases resolve against it by name.
const plans = payload.collections.flatMap((c) => {
  const out = [];
  for (let i = 0; i < c.variables.length; i += CHUNK) {
    const last = i + CHUNK >= c.variables.length;
    out.push({ name: c.name, modes: c.modes, hidden: c.hidden, variables: c.variables.slice(i, i + CHUNK), ...(last ? { allNames: c.variables.map((v) => v.name) } : {}) });
  }
  return out;
});
const styles = { textStyles: payload.textStyles, effectStyles: payload.effectStyles };
// use_figma takes code inline, so the agent re-types every script. The script
// hashes its own data and refuses to write if a byte changed in transit.
const fnv1a = (str) => { let h = 0x811c9dc5; for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 0x01000193) >>> 0; return h.toString(16); };
const script = (ps, withStyles) => [
  `const DRY_RUN = ${DRY_RUN};`,
  `const PLANS = ${JSON.stringify(ps)};`,
  ...(withStyles ? [`const STYLES = ${JSON.stringify(styles)};`] : []),
  `const CHECKSUM = "${fnv1a(JSON.stringify(ps) + (withStyles ? JSON.stringify(styles) : ""))}";`,
  `const fnv1a = ${fnv1a.toString()};`,
  `const actual = fnv1a(JSON.stringify(PLANS) + (typeof STYLES === "undefined" ? "" : JSON.stringify(STYLES)));`,
  "if (actual !== CHECKSUM) throw new Error(`checksum mismatch ${actual} != ${CHECKSUM}: script altered in transit, nothing written`);",
  varRuntime,
  ...(withStyles ? [styleRuntime] : []),
  "const results = [];",
  "for (const PLAN of PLANS) results.push(await syncCollection(PLAN));",
  ...(withStyles ? ["results.push(await syncStyles(STYLES));"] : []),
  "return results;",
].join("\n");

// One call if it fits under the code limit, otherwise one call per chunk, styles last.
const single = script(plans, true);
const scripts = single.length <= MAX && !args.includes("--split")
  ? [["all", single]]
  : [...plans.map((p) => [`${p.name.toLowerCase()}`, script([p], false)]), ["styles", script([], true)]];
scripts.forEach(([name, code], i) => {
  const file = `${String(i + 1).padStart(2, "0")}-${name}.js`;
  writeFileSync(new URL(file, dir), code);
  const flag = code.length > MAX ? "  OVER use_figma's 50,000-char code limit" : "";
  console.log(`${file.padEnd(24)} ${String(code.length).padStart(6)} chars${flag}`);
});
