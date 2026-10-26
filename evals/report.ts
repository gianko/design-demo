// `pnpm eval:report <a.json> [b.json]` (ADR 0008): one results file gives a
// run report, two give a side-by-side comparison. The report is one
// self-contained HTML file in gitignored `evals/reports/`, styled by the
// design system's own tokens.css, with its font and any screenshots inline.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, join, relative, resolve } from "node:path";
import { parseArgs } from "node:util";
import type { StepConfig } from "../generator/config.ts";
import type { GateName } from "../generator/failure.ts";
import type { Attempt } from "../generator/generate.ts";
import { pascalCase } from "../generator/screen-stories.ts";
import { defaultState } from "../src/components/Screen/default-state.ts";
import {
  type Rate,
  type RepResult,
  type ResultsFile,
  latestResults,
  tally,
} from "./results.ts";
import { repo } from "../repo.ts";

export type ReportDeps = {
  log?: (line: string) => void;
  // Where a report goes without --out.
  reportsDir?: string;
  // Where --latest looks.
  resultsDir?: string;
};

const usage = `Usage: pnpm eval:report <a.json> [b.json] [--out <file.html>] [--no-screenshots]
       pnpm eval:report --latest [--out <file.html>] [--no-screenshots]`;

export async function main(
  argv: string[],
  deps: ReportDeps = {}
): Promise<number> {
  const log = deps.log ?? console.log;
  const reportsDir = deps.reportsDir ?? join(repo, "evals", "reports");
  const resultsDir = deps.resultsDir ?? join(repo, "evals", "results");

  let parsed;
  try {
    parsed = parseArgs({
      args: argv,
      allowPositionals: true,
      allowNegative: true,
      options: {
        screenshots: { type: "boolean", default: true },
        latest: { type: "boolean", default: false },
        out: { type: "string" },
      },
    });
  } catch (error) {
    log((error as Error).message);
    log(usage);
    return 2;
  }
  const { values, positionals } = parsed;
  let paths = positionals.map((path) => resolve(repo, path));
  if (values.latest) {
    if (paths.length) {
      log("--latest takes no results files.");
      log(usage);
      return 2;
    }
    // Not an error: the Pages deploy runs before any results file exists.
    const latest = latestResults(resultsDir);
    if (!latest) {
      log(`No results file in ${relative(repo, resultsDir)}: no report.`);
      return 0;
    }
    paths = [latest.path];
  }
  if (paths.length < 1 || paths.length > 2) {
    log(usage);
    return 2;
  }
  const runs = paths.map((path) => loadRun(path, values.screenshots));
  const html = reportHtml(runs);
  const out = values.out
    ? resolve(values.out)
    : join(reportsDir, `${runs.map((run) => run.name).join("-vs-")}.html`);
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, html);
  log(`report: ${relative(repo, out)}`);
  return 0;
}

// One render's screenshot, as a data URI.
export type Shot = { theme: string; state: string; src: string };

export type ReportRun = {
  // The results file's name, less `.json`.
  name: string;
  file: ResultsFile;
  // Per rep and attempt (`shotKey`), the screenshots of its final and
  // failing code attempts; null when they were left out.
  shots: Map<string, Shot[]> | null;
  // Why screenshots were left out, or where they came from.
  shotsNote: string;
};

// A results file and, when asked for and its scratch folder exists locally,
// the screenshots of each rep's final and failing code attempts.
export function loadRun(path: string, screenshots: boolean): ReportRun {
  const file = JSON.parse(readFileSync(path, "utf8")) as ResultsFile;
  const name = basename(path, ".json");
  const workDirs = file.reps.flatMap((rep) =>
    rep.workDir ? [rep.workDir] : []
  );
  const runDir = workDirs.length ? dirname(workDirs[0]!) : null;
  if (!screenshots)
    return {
      name,
      file,
      shots: null,
      shotsNote: "left out (--no-screenshots)",
    };
  if (runDir === null || !existsSync(resolve(repo, runDir)))
    return {
      name,
      file,
      shots: null,
      shotsNote: `left out: no scratch folder${runDir ? ` at ${runDir}` : ""}`,
    };
  const shots = new Map<string, Shot[]>();
  for (const rep of file.reps) {
    if (!rep.workDir) continue;
    rep.attempts.forEach((attempt, index) => {
      if (attempt.step !== "code") return;
      const final = index === rep.attempts.length - 1;
      if (!final && !failed(attempt)) return;
      const found = readShots(
        join(resolve(repo, rep.workDir!), `attempt-${attempt.attempt}-code`),
        attempt
      );
      if (found.length) shots.set(shotKey(rep, attempt), found);
    });
  }
  return { name, file, shots, shotsNote: `embedded from ${runDir}` };
}

const shotKey = (rep: RepResult, attempt: Attempt) =>
  `${rep.brief}-${rep.rep}/attempt-${attempt.attempt}-${attempt.step}`;

const failed = (attempt: Attempt) =>
  Object.values(attempt.gates).includes("fail");

// The render pass's screenshots of one code attempt: each render's `rest`
// shot, attached inline to Playwright's results.json under `render/out/`
// (gates/stories.spec.ts). A story's id names its screen state through the
// Storybook index's export name.
function readShots(attemptDir: string, attempt: Attempt): Shot[] {
  const render = join(attemptDir, "render");
  const resultsFile = join(render, "out", "results.json");
  if (!existsSync(resultsFile)) return [];
  const report = JSON.parse(
    readFileSync(resultsFile, "utf8")
  ) as PlaywrightReport;
  const indexFile = join(render, "storybook-static", "index.json");
  const exportNames = new Map<string, string>(
    existsSync(indexFile)
      ? Object.values(
          (JSON.parse(readFileSync(indexFile, "utf8")) as StorybookIndex)
            .entries
        ).map((entry) => [entry.id, entry.exportName ?? ""])
      : []
  );
  const stateOf = new Map(
    [defaultState, ...(attempt.renders ?? []).map((each) => each.state)].map(
      (state) => [pascalCase(state), state]
    )
  );
  const shots: Shot[] = [];
  for (const file of report.suites ?? [])
    for (const story of file.suites ?? []) {
      const state =
        stateOf.get(exportNames.get(story.title) ?? "") ?? story.title;
      for (const spec of story.specs ?? []) {
        const theme = spec.title.split(" · ")[0]!;
        const rest = spec.tests?.[0]?.results
          ?.at(-1)
          ?.attachments?.find((each) => each.name === "rest" && each.body);
        if (rest)
          shots.push({
            theme,
            state,
            src: `data:${rest.contentType ?? "image/png"};base64,${rest.body}`,
          });
      }
    }
  return shots;
}

type PlaywrightReport = {
  suites?: {
    suites?: {
      title: string;
      specs?: {
        title: string;
        tests?: {
          results?: {
            attachments?: {
              name: string;
              contentType?: string;
              body?: string;
            }[];
          }[];
        }[];
      }[];
    }[];
  }[];
};

type StorybookIndex = {
  entries: Record<string, { id: string; exportName?: string }>;
};

export function reportHtml(runs: ReportRun[]): string {
  const title = runs.length === 1 ? "Eval run report" : "Eval comparison";
  return `<!doctype html>
<html lang="en" data-theme="light" data-density="admin">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escape(title)}</title>
<script>
// The reader's colour scheme picks the theme.
if (matchMedia("(prefers-color-scheme: dark)").matches)
  document.documentElement.dataset.theme = "dark";
</script>
<style>
${styles()}
</style>
</head>
<body>
<main>
<h1>${escape(title)}</h1>
${legend(runs)}
${briefSetsDiffer(runs)}
<section>
<h2>Screen briefs</h2>
<p class="note">Counts, not percentages: at K = ${[...new Set(runs.map((run) => run.file.k))].join(" and ")} a difference of one rep is no evidence either way. Errors and skips are left out of the passes. Mean attempts are per step, over the reps that passed or failed. Gate columns count the attempts that failed each gate.</p>
${summary(runs)}
</section>
${runs.map((run, index) => repsSection(run, runs.length > 1 ? letter(index) : null)).join("\n")}
</main>
</body>
</html>
`;
}

// The gates in the order a rep meets them.
const gates: GateName[] = [
  "gate 1",
  "gate 2",
  "gate 3",
  "gate 7 static",
  "gate 4",
  "gate 7 render",
];

const overall = "All briefs";

// What each run is: its results file and its version tuple. In a
// comparison, a field the runs disagree on is marked.
function legend(runs: ReportRun[]) {
  const short = (hash: string) => hash.slice(0, 12);
  const fields: [string, (file: ResultsFile) => string][] = [
    ["Run", (file) => file.runId],
    ["Started", (file) => file.startedAt],
    [
      "Commit",
      (file) =>
        short(file.versions.gitSha) + (file.versions.dirty ? " (dirty)" : ""),
    ],
    ["Registry", (file) => short(file.versions.registryHash)],
    ["Spec prompt", (file) => short(file.versions.specPromptHash)],
    ["Code prompt", (file) => short(file.versions.codePromptHash)],
    ["Spec step", (file) => stepConfig(file.versions.spec)],
    ["Code step", (file) => stepConfig(file.versions.code)],
    ["Screen briefs", (file) => `${file.briefSlugs.length} (${file.briefs})`],
    ["K", (file) => String(file.k)],
    [
      "Budget",
      (file) => (file.budget === null ? "none" : dollars(file.budget)),
    ],
  ];
  const rows: [string, (run: ReportRun) => string][] = [
    ...fields.map(([label, value]): [string, (run: ReportRun) => string] => [
      label,
      (run) => value(run.file),
    ]),
    ["Screenshots", (run) => run.shotsNote],
  ];
  // Two runs always differ in these, so marking them would say nothing.
  const identity = new Set(["Run", "Started", "Screenshots"]);
  const compare = runs.length > 1;
  const head = runs
    .map(
      (run, index) =>
        `<th scope="col">${compare ? `<span class="letter">${letter(index)}</span> ` : ""}${escape(run.name)}</th>`
    )
    .join("");
  const body = rows
    .map(([label, value]) => {
      const values = runs.map(value);
      const differs =
        compare && !identity.has(label) && new Set(values).size > 1;
      return `<tr${differs ? ' class="differs"' : ""}><th scope="row">${escape(label)}</th>${values
        .map((each) => `<td>${escape(each)}</td>`)
        .join("")}</tr>`;
    })
    .join("\n");
  return `<div class="table"><table class="runs">
<thead><tr><th scope="col">Results file</th>${head}</tr></thead>
<tbody>
${body}
</tbody>
</table></div>${compare ? `<p class="note">Marked rows differ between the runs.</p>` : ""}`;
}

function stepConfig(config: StepConfig) {
  return `${config.model}, ${config.effort} effort, up to ${config.attempts} attempts`;
}

// ADR 0008: a comparison flags runs whose brief sets differ, since their
// overall counts then cover different screen briefs.
function briefSetsDiffer(runs: ReportRun[]) {
  if (runs.length < 2) return "";
  const [a, b] = runs.map((run) => new Set(run.file.briefSlugs)) as [
    Set<string>,
    Set<string>,
  ];
  const onlyA = [...a].filter((slug) => !b.has(slug));
  const onlyB = [...b].filter((slug) => !a.has(slug));
  if (onlyA.length === 0 && onlyB.length === 0) return "";
  const only = (name: string, slugs: string[]) =>
    slugs.length
      ? `<li>only in ${name}: ${slugs.map(escape).join(", ")}</li>`
      : "";
  return `<aside class="brief-sets-differ" role="note">
<p><strong>These runs cover different screen briefs</strong>, so their overall counts aren't over the same briefs.</p>
<ul>${only("A", onlyA)}${only("B", onlyB)}</ul>
</aside>`;
}

// One row per screen brief, and per run in a comparison, then the overall
// row: counts, not percentages, with no claim of significance at K≈3.
function summary(runs: ReportRun[]) {
  const briefs = [...new Set(runs.flatMap((run) => run.file.briefSlugs))];
  const compare = runs.length > 1;
  const head = [
    "Screen brief",
    ...(compare ? ["Run"] : []),
    "Passed (first attempt → final)",
    "Errors",
    "Skipped",
    "Mean attempts (spec · code)",
    "Cost",
    "Wall time",
    ...gates,
  ];
  const row = (
    brief: string,
    run: ReportRun,
    index: number,
    reps: RepResult[]
  ) => {
    const runCell = compare ? `<td>${letter(index)}</td>` : "";
    if (brief !== overall && !run.file.briefSlugs.includes(brief))
      return `<tr><th scope="row">${escape(brief)}</th>${runCell}<td colspan="${head.length - (compare ? 2 : 1)}">not in this run</td></tr>`;
    const counts = tally(reps);
    const failures = gateFailures(reps);
    return `<tr${brief === overall ? ' class="overall"' : ""}><th scope="row">${escape(brief)}</th>${runCell}<td>${rate(counts.firstAttempt)} → ${rate(counts.final)}</td><td>${counts.error}</td><td>${counts.skipped}</td><td>${meanAttempts(reps)}</td><td>${dollars(counts.cost)}</td><td>${duration(counts.wallMs)}</td>${gates
      .map((gate) => `<td>${failures[gate]}</td>`)
      .join("")}</tr>`;
  };
  const body = [
    ...briefs.flatMap((brief) =>
      runs.map((run, index) =>
        row(
          brief,
          run,
          index,
          run.file.reps.filter((rep) => rep.brief === brief)
        )
      )
    ),
    ...runs.map((run, index) => row(overall, run, index, run.file.reps)),
  ];
  return `<div class="table"><table class="summary">
<thead><tr>${head.map((cell) => `<th scope="col">${escape(cell)}</th>`).join("")}</tr></thead>
<tbody>
${body.join("\n")}
</tbody>
</table></div>`;
}

// Every rep of one run, brief by brief: its outcome, then each attempt's
// gates and failure lines, and the screenshots of its final and failing
// code attempts where they were found.
function repsSection(run: ReportRun, name: string | null) {
  const briefs = run.file.briefSlugs.map((brief) => {
    const reps = run.file.reps
      .filter((rep) => rep.brief === brief)
      .sort((a, b) => a.rep - b.rep)
      .map((rep) => repDetails(run, rep))
      .join("\n");
    return `<section class="brief">
<h3>${escape(brief)}</h3>
${reps}
</section>`;
  });
  return `<section class="reps">
<h2>Reps${name ? ` of run ${name}` : ""}</h2>
${briefs.join("\n")}
</section>`;
}

function repDetails(run: ReportRun, rep: RepResult) {
  const missing = rep.criteria?.missing.length
    ? `<p>Pass criteria missing: ${rep.criteria.missing.map(escape).join(", ")}</p>`
    : "";
  const attempts = rep.attempts
    .map((attempt) => {
      const gateList = Object.entries(attempt.gates)
        .map(
          ([gate, result]) =>
            `<li class="gate ${escape(result)}">${escape(gate)} ${escape(result)}</li>`
        )
        .join("");
      const failures = attempt.failures.length
        ? `<ul class="failures">${attempt.failures
            .map((line) => `<li><code>${escape(line)}</code></li>`)
            .join("")}</ul>`
        : "";
      const shots = run.shots?.get(shotKey(rep, attempt)) ?? [];
      const gallery = shots.length
        ? `<div class="shots">${shots
            .map(
              (each) =>
                `<figure><img src="${each.src}" alt="${escape(`${rep.brief} rep ${rep.rep}, ${attempt.step} attempt ${attempt.attempt}, ${each.theme} · ${each.state}`)}" loading="lazy"><figcaption>${escape(`${each.theme} · ${each.state}`)}</figcaption></figure>`
            )
            .join("")}</div>`
        : "";
      return `<li class="attempt"><p>${escape(attempt.step)} attempt ${attempt.attempt} · ${dollars(attempt.cost)}</p><ul class="gates">${gateList}</ul>${failures}${gallery}</li>`;
    })
    .join("");
  return `<details class="rep ${escape(rep.outcome)}"${rep.outcome === "pass" ? "" : " open"}>
<summary>rep ${rep.rep} · <strong>${escape(rep.outcome)}</strong> · ${escape(rep.endReason)} · ${dollars(rep.cost)} · ${duration(rep.wallMs)}</summary>
${missing}
<ol class="attempts">${attempts}</ol>
</details>`;
}

// Attempts per step, over the reps a pass rate counts that ran the step.
function meanAttempts(reps: RepResult[]) {
  const counted = reps.filter(
    (rep) => rep.outcome === "pass" || rep.outcome === "fail"
  );
  return (["spec", "code"] as const)
    .map((step) => {
      const perRep = counted
        .map((rep) => rep.attempts.filter((each) => each.step === step).length)
        .filter((n) => n > 0);
      return perRep.length
        ? (perRep.reduce((sum, n) => sum + n, 0) / perRep.length).toFixed(1)
        : "–";
    })
    .join(" · ");
}

// Per gate, the attempts it failed.
function gateFailures(reps: RepResult[]) {
  const counts = Object.fromEntries(gates.map((gate) => [gate, 0])) as Record<
    GateName,
    number
  >;
  for (const rep of reps)
    for (const each of rep.attempts)
      for (const gate of gates) if (each.gates[gate] === "fail") counts[gate]++;
  return counts;
}

function letter(index: number) {
  return String.fromCharCode(65 + index);
}

function rate({ passed, of }: Rate) {
  return `${passed}/${of}`;
}

function dollars(usd: number) {
  return `$${usd.toFixed(2)}`;
}

function duration(ms: number) {
  const seconds = Math.round(ms / 1000);
  return seconds < 60
    ? `${seconds}s`
    : `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
}

// tokens.css as the library ships it (its Tailwind-only blocks are at-rules
// a browser skips), the brief's typeface inline, then the page's own rules,
// which use nothing but its variables.
function styles() {
  return [
    readFileSync(join(repo, "tokens", "tokens.css"), "utf8"),
    fontFaces(),
    pageCss,
  ].join("\n");
}

function fontFaces() {
  const files = join(
    repo,
    "node_modules",
    "@fontsource",
    "instrument-sans",
    "files"
  );
  return [400, 600]
    .map((weight) => {
      const data = readFileSync(
        join(files, `instrument-sans-latin-${weight}-normal.woff2`)
      ).toString("base64");
      return `@font-face {
  font-family: "Instrument Sans";
  font-style: normal;
  font-weight: ${weight};
  font-display: swap;
  src: url(data:font/woff2;base64,${data}) format("woff2");
}`;
    })
    .join("\n");
}

const pageCss = `
* { box-sizing: border-box; }
body {
  margin: 0;
  background: var(--ds-color-bg-page);
  color: var(--ds-color-text-ink);
  font-family: var(--ds-type-family-sans);
  font-size: var(--ds-density-text-body-font-size);
  line-height: var(--ds-density-text-body-line-height);
}
main {
  max-width: 1200px;
  margin: 0 auto;
  padding: var(--ds-density-padding-page);
}
h1 {
  margin: 0 0 var(--ds-space-lg);
  font-size: var(--ds-type-title-font-size);
  line-height: var(--ds-type-title-line-height);
  letter-spacing: var(--ds-type-title-letter-spacing);
  font-weight: var(--ds-type-title-font-weight);
}
h2 {
  margin: var(--ds-space-2xl) 0 var(--ds-space-xs);
  font-size: var(--ds-type-heading-font-size);
  line-height: var(--ds-type-heading-line-height);
  font-weight: var(--ds-type-heading-font-weight);
}
h3 {
  margin: var(--ds-space-lg) 0 var(--ds-space-2xs);
  font-size: var(--ds-density-text-label-font-size);
  line-height: var(--ds-density-text-label-line-height);
  font-weight: var(--ds-density-text-label-font-weight);
}
.note {
  max-width: 72ch;
  color: var(--ds-color-text-ink-muted);
}
.table {
  overflow-x: auto;
  background: var(--ds-color-bg-surface);
  border: 1px solid var(--ds-color-border-line);
  border-radius: var(--ds-density-radius-surface);
}
table {
  width: 100%;
  border-collapse: collapse;
}
.overall > * {
  border-top: 2px solid var(--ds-color-border-control);
  font-weight: var(--ds-type-weight-semibold);
}
.overall ~ .overall > * { border-top: 0; }
th, td {
  padding: var(--ds-space-2xs) var(--ds-space-xs);
  border-bottom: 1px solid var(--ds-color-border-line);
  text-align: left;
  white-space: nowrap;
}
thead th {
  color: var(--ds-color-text-ink-muted);
  font-weight: var(--ds-density-text-label-font-weight);
}
tbody tr:last-child > * { border-bottom: 0; }
.summary td {
  text-align: right;
  font-variant-numeric: tabular-nums;
}
.summary td[colspan] {
  text-align: left;
  color: var(--ds-color-text-ink-muted);
}
.runs .differs > * {
  background: var(--ds-color-bg-awaiting);
  color: var(--ds-color-text-awaiting);
}
.letter {
  display: inline-block;
  padding: 0 var(--ds-space-3xs);
  border-radius: var(--ds-radius-tag);
  background: var(--ds-color-bg-selected);
}
.brief-sets-differ {
  margin: var(--ds-space-lg) 0;
  padding: var(--ds-space-sm) var(--ds-density-padding-surface);
  border-radius: var(--ds-density-radius-surface);
  background: var(--ds-color-bg-overdue);
  color: var(--ds-color-text-overdue);
}
.brief-sets-differ p, .brief-sets-differ ul { margin: 0; }
.rep {
  margin: var(--ds-space-2xs) 0;
  padding: var(--ds-space-2xs) var(--ds-space-xs);
  background: var(--ds-color-bg-surface);
  border: 1px solid var(--ds-color-border-line);
  border-radius: var(--ds-density-radius-surface);
}
.rep summary { cursor: pointer; }
.rep.pass strong { color: var(--ds-color-text-paid); }
.rep.fail strong, .rep.error strong { color: var(--ds-color-text-overdue); }
.rep.skipped strong { color: var(--ds-color-text-ink-muted); }
.attempts {
  margin: var(--ds-space-2xs) 0 0;
  padding-left: var(--ds-space-lg);
}
.attempt { margin: var(--ds-space-xs) 0; }
.attempt p { margin: 0; }
.gates, .failures {
  margin: var(--ds-space-3xs) 0;
  padding: 0;
  list-style: none;
}
.gates { display: flex; flex-wrap: wrap; gap: var(--ds-space-3xs); }
.gate {
  padding: 0 var(--ds-space-2xs);
  border-radius: var(--ds-radius-tag);
  font-size: var(--ds-type-caption-font-size);
  line-height: var(--ds-type-caption-line-height);
  background: var(--ds-color-bg-surface-raised);
  color: var(--ds-color-text-ink-muted);
}
.gate.pass { background: var(--ds-color-bg-paid); color: var(--ds-color-text-paid); }
.gate.fail { background: var(--ds-color-bg-overdue); color: var(--ds-color-text-overdue); }
.failures code {
  font-size: var(--ds-type-caption-font-size);
  line-height: var(--ds-type-caption-line-height);
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}
.shots {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: var(--ds-space-xs);
  margin-top: var(--ds-space-2xs);
}
figure { margin: 0; }
figure img {
  display: block;
  max-width: 100%;
  height: auto;
  border: 1px solid var(--ds-color-border-line);
  border-radius: var(--ds-radius-control);
}
figcaption {
  color: var(--ds-color-text-ink-muted);
  font-size: var(--ds-type-caption-font-size);
  line-height: var(--ds-type-caption-line-height);
}
`;

function escape(text: string) {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
