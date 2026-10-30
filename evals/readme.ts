// `pnpm evals:readme`: rewrites the README's eval table, between its two
// markers, from the newest results file, the one the Pages deploy reports on.
// Run it after committing an eval run; a test fails while the README's table
// differs from what this writes, so the table can't drift from the evidence.

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, join, relative } from "node:path";
import { readScreenBrief } from "../generator/screen-brief.ts";
import {
  type Gate5Mode,
  type Rate,
  type ResultsFile,
  type Tally,
  gate5Mode,
  latestResults,
} from "./results.ts";
import { dollars } from "../format.ts";
import { repo } from "../repo.ts";

export type ReadmePaths = {
  readmePath: string;
  // Where the newest results file is looked for.
  resultsDir: string;
  // Where each screen brief's audience is read from.
  briefsDir: string;
};

export type ReadmeDeps = Partial<ReadmePaths> & {
  log?: (line: string) => void;
};

const defaults: ReadmePaths = {
  readmePath: join(repo, "README.md"),
  resultsDir: join(repo, "evals", "results"),
  briefsDir: join(repo, "evals", "briefs"),
};

const start =
  "<!-- eval-table:start: written by `pnpm evals:readme` from the newest results file -->";
const end = "<!-- eval-table:end -->";

// The deployed eval report, which reports on the newest run (ADR 0008).
const reportUrl = "https://gianko.github.io/design-demo/evals/";

const usage = "Usage: pnpm evals:readme";

export async function main(
  argv: string[],
  deps: ReadmeDeps = {}
): Promise<number> {
  const log = deps.log ?? console.log;
  const paths: ReadmePaths = {
    readmePath: deps.readmePath ?? defaults.readmePath,
    resultsDir: deps.resultsDir ?? defaults.resultsDir,
    briefsDir: deps.briefsDir ?? defaults.briefsDir,
  };
  if (argv.length) {
    log(usage);
    return 2;
  }
  const readme = readFileSync(paths.readmePath, "utf8");
  let rewritten;
  try {
    rewritten = rewrittenReadme(readme, paths);
  } catch (error) {
    log((error as Error).message);
    return 1;
  }
  writeFileSync(paths.readmePath, rewritten);
  const latest = latestResults(paths.resultsDir)!;
  log(
    `${relative(repo, paths.readmePath) || basename(paths.readmePath)}: the eval table from ${basename(latest.path, ".json")}`
  );
  return 0;
}

// The README with the newest run's table between its markers, and nothing
// else changed. Throws when the markers or a results file are missing.
export function rewrittenReadme(
  readme: string,
  paths: ReadmePaths = defaults
): string {
  const from = readme.indexOf(start);
  const to = readme.indexOf(end, from);
  if (from === -1 || to === -1)
    throw new Error(
      `${paths.readmePath} has no eval table markers: put\n${start}\n${end}\nwhere the table goes.`
    );
  const latest = latestResults(paths.resultsDir);
  if (!latest)
    throw new Error(
      `No results file in ${relative(repo, paths.resultsDir)}: no eval table.`
    );
  return (
    readme.slice(0, from + start.length) +
    `\n\n${evalTable(latest.path, latest.file, paths)}\n\n` +
    readme.slice(to)
  );
}

// Opus 5.5 for claude-opus-5-5; any other id as it is.
function modelName(id: string) {
  const match = /^claude-([a-z]+)-(\d+)-(\d+)$/.exec(id);
  if (!match) return id;
  const [, family, major, minor] = match;
  return `${family![0]!.toUpperCase()}${family!.slice(1)} ${major}.${minor}`;
}

const rate = ({ passed, of }: Rate) => `${passed} / ${of}`;

// The judge's share, as the report shows it, so a run with gate 5 compares
// fairly with one from before it.
const cost = ({ cost, gate5 }: Tally) =>
  gate5
    ? `${dollars(cost)}, of which gate 5 ${dollars(gate5.cost)}`
    : dollars(cost);

const count = (n: number, noun: string) => `${n} ${noun}${n === 1 ? "" : "s"}`;

function evalTable(path: string, file: ResultsFile, paths: ReadmePaths) {
  const here = dirname(paths.readmePath);
  const link = (to: string) => relative(here, to);
  const { versions, totals } = file;
  const models = [
    ...new Set([versions.spec.model, versions.code.model].map(modelName)),
  ].join(" and ");
  const tree = versions.dirty ? "a dirty tree" : "a clean tree";
  const results = `[results file](${link(path)})`;
  const report = `[report](${reportUrl})`;
  const where = `${count(file.briefSlugs.length, "screen brief")}, K = ${file.k}, ${models}, on ${tree} at \`${versions.gitSha.slice(0, 7)}\``;
  const baselinePath = file.baseline
    ? join(dirname(path), `${file.baseline}.json`)
    : null;
  const intro = file.baseline
    ? `${where} (${results}). The ${report} compares it against [${file.baseline}](${link(baselinePath!)}).`
    : `${where} (${results}, ${report}).`;
  const baseline =
    file.baseline && existsSync(baselinePath!)
      ? {
          name: file.baseline,
          mode: gate5Mode(
            JSON.parse(readFileSync(baselinePath!, "utf8")) as ResultsFile
          ),
        }
      : null;
  const soft = gate5Soft(gate5Mode(file), baseline);

  const rows = file.briefSlugs.map((slug) => {
    const brief = join(paths.briefsDir, `${slug}.md`);
    const tally = file.perBrief[slug]!;
    return `| [${slug}](${link(brief)}) | ${readScreenBrief(brief).audience} | ${rate(tally.final)} | ${rate(tally.firstAttempt)} | ${cost(tally)} |`;
  });
  const table = [
    "| Screen brief | Audience | Passed | First attempt | Cost |",
    "|---|---|---|---|---|",
    ...rows,
    `| **All** | | **${rate(totals.final)}** | **${rate(totals.firstAttempt)}** | **${cost(totals)}** |`,
  ].join("\n");

  // "1 rep errored and 2 were skipped", the noun on the first only.
  const left = [
    [totals.error, "errored"],
    [totals.skipped, totals.skipped === 1 ? "was skipped" : "were skipped"],
  ]
    .filter(([n]) => n)
    .map(([n, what], i) =>
      i === 0 ? `${count(n as number, "rep")} ${what}` : `${n} ${what}`
    );
  const leftOut = left.length
    ? `\n\n${left.join(" and ")}; the pass rates leave them out.`
    : "";
  return `${intro}${soft ? ` ${soft}` : ""}\n\n${table}${leftOut}`;
}

// Gate 5 counts in a run's passes only where it was hard (since #347), so
// the table says when this run, or the baseline it's compared against, had
// it soft or not at all: their passes don't count it. A run without gate 5
// says nothing, as its table doesn't either.
function gate5Soft(
  mode: Gate5Mode,
  baseline: { name: string; mode: Gate5Mode } | null
) {
  const counts = " count brief conformance.";
  if (mode === "none") return "";
  if (mode === "soft") {
    if (baseline?.mode === "soft")
      return `Gate 5 was soft in this run and in ${baseline.name}, so neither's passes${counts}`;
    if (baseline?.mode === "none")
      return `Gate 5 was soft in this run, and ${baseline.name} ran without it, so neither's passes${counts}`;
    return `Gate 5 was soft in this run, so its passes don't${counts}`;
  }
  if (baseline?.mode === "soft")
    return `Gate 5 was soft in ${baseline.name}, so its passes don't${counts}`;
  if (baseline?.mode === "none")
    return `${baseline.name} ran without gate 5, so its passes don't${counts}`;
  return "";
}
