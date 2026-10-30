// `pnpm evals:report <a.json> [b.json]` (ADR 0008): one results file gives a
// run report, two give a side-by-side comparison. `--latest` takes the
// newest results file, compared against the baseline it names if it names
// one, as the Pages deploy reports at /evals/. The report is one
// self-contained HTML file in gitignored `evals/reports/`, styled by the
// design system's own tokens.css, with its font and any screenshots inline.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, join, relative, resolve } from "node:path";
import { parseArgs } from "node:util";
import type { StepConfig } from "../generator/config.ts";
import { findings, rubricCriteria } from "../generator/conformance.ts";
import type { GateName } from "../generator/failure.ts";
import type { Attempt } from "../generator/generate.ts";
import { pascalCase } from "../generator/screen-stories.ts";
import { defaultState } from "../src/components/Screen/default-state.ts";
import {
  type Rate,
  type RepGate5,
  type RepResult,
  type ResultsFile,
  counted,
  latestResults,
  tally,
} from "./results.ts";
import { dollars, escapeHtml } from "../format.ts";
import { repo } from "../repo.ts";

export type ReportDeps = {
  log?: (line: string) => void;
  // Where a report goes without --out.
  reportsDir?: string;
  // Where --latest looks.
  resultsDir?: string;
};

const usage = `Usage: pnpm evals:report <a.json> [b.json] [--out <file.html>] [--no-screenshots]
       pnpm evals:report --latest [--out <file.html>] [--no-screenshots]`;

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
    // The newest run is compared against the baseline it names, as run A.
    const named = latest.file.baseline;
    if (named) {
      const baseline = join(resultsDir, `${named}.json`);
      if (!existsSync(baseline)) {
        log(
          `${relative(repo, latest.path)} names ${named} as its baseline, but ${relative(repo, baseline)} doesn't exist.`
        );
        return 1;
      }
      paths = [baseline, latest.path];
    }
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
  `${rep.slug}-${rep.rep}/attempt-${attempt.attempt}-${attempt.step}`;

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

// The light theme, always: ADR 0002 has no automatic OS following in P0.
export function reportHtml(runs: ReportRun[]): string {
  const title = runs.length === 1 ? "Eval run report" : "Eval comparison";
  return `<!doctype html>
<html lang="en" data-theme="light" data-density="admin">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<style>
${styles()}
</style>
</head>
<body>
<main>
<h1>${escapeHtml(title)}</h1>
${legend(runs)}
${briefSetsDiffer(runs)}
<section>
<h2>Screen briefs</h2>
<p class="note">${runs.length > 1 ? "Side by side, each cell reads run A → run B." : "Passes read first attempt → final."} Counts, not percentages: at K = ${[...new Set(runs.map((run) => run.file.k))].join(" and ")} a difference of one rep is no evidence either way. Errors and skips are left out of the passes. Mean attempts are per step, over the reps that passed or failed. Gate columns count the attempts that failed each gate. Brief conformance (gate 5) is soft, so it sits beside the passes, never in them: a judged rep passes a criterion when every screen state passes it, and a run without gate 5 reads not run. Cost takes in the judge's calls, and says how much of it is gate 5's.</p>
${summaries(runs)}
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

const overall = "All screen briefs";

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
    [
      "Gate 5 judge",
      ({ versions: { judge } }) =>
        judge ? `${judge.model}, ${judge.effort} effort` : "not run",
    ],
    [
      "Gate 5 prompt",
      ({ versions: { judge } }) =>
        judge ? short(judge.promptHash) : "not run",
    ],
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
        `<th scope="col">${compare ? `<span class="letter">${letter(index)}</span> ` : ""}${escapeHtml(run.name)}</th>`
    )
    .join("");
  const body = rows
    .map(([label, value]) => {
      const values = runs.map(value);
      const differs =
        compare && !identity.has(label) && new Set(values).size > 1;
      return `<tr${differs ? ' class="differs"' : ""}><th scope="row">${escapeHtml(label)}</th>${values
        .map((each) => `<td>${escapeHtml(each)}</td>`)
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

// ADR 0008: a comparison flags runs whose brief sets differ. Only the screen
// briefs both cover are compared; the rest are shown alone.
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
      ? `<li>only in ${name}: ${slugs.map((slug) => escapeHtml(slug)).join(", ")}</li>`
      : "";
  return `<aside class="brief-sets-differ" role="note">
<p><strong>These runs cover different screen briefs</strong>, so only the screen briefs both runs cover are compared side by side, with an overall row over those alone. The others are shown on their own, below.</p>
<ul>${only("A", onlyA)}${only("B", onlyB)}</ul>
</aside>`;
}

// The summary tables. A run report has one; so does a comparison of runs over
// the same screen briefs. When their brief sets differ, the screen briefs
// both runs cover are compared side by side, and those only one run covers
// are shown alone, each set with an overall row over that set alone.
function summaries(runs: ReportRun[]) {
  if (runs.length === 1)
    return tables(runs, runs[0]!.file.briefSlugs, overall, "run");
  const [a, b] = runs as [ReportRun, ReportRun];
  const inB = new Set(b.file.briefSlugs);
  const shared = a.file.briefSlugs.filter((slug) => inB.has(slug));
  const only = runs.map((run, index) => ({
    run,
    name: letter(index),
    briefs: run.file.briefSlugs.filter((slug) => !shared.includes(slug)),
  }));
  if (only.every((each) => each.briefs.length === 0))
    return tables(runs, shared, overall, "compare");
  const set = (heading: string, table: string) => `<section class="brief-set">
<h3>${escapeHtml(heading)}</h3>
${table}
</section>`;
  return [
    shared.length
      ? set(
          `In both runs (${shared.length}), side by side`,
          tables(runs, shared, `All in both runs (${shared.length})`, "compare")
        )
      : "",
    ...only
      .filter((each) => each.briefs.length)
      .map(({ run, name, briefs }) =>
        set(
          `Only in run ${name} (${briefs.length})`,
          tables(
            [run],
            briefs,
            `All only in ${name} (${briefs.length})`,
            "alone"
          )
        )
      ),
  ].join("\n");
}

type Mode = "run" | "compare" | "alone";

// A set of screen briefs' summary table, then its gate 5 table.
function tables(
  runs: ReportRun[],
  briefs: string[],
  overallLabel: string,
  mode: Mode
) {
  return [
    summary(runs, briefs, overallLabel, mode),
    gate5Table(runs, briefs, overallLabel, mode),
  ].join("\n");
}

// One row per screen brief, then the overall row over those screen briefs:
// counts, not percentages, with no claim of significance at K≈3. A run
// report's passes read first attempt → final; in a comparison every cell
// reads run A → run B (ADR 0008), and a screen brief only one run covers
// shows that run's counts alone, in the comparison's columns.
function summary(
  runs: ReportRun[],
  briefs: string[],
  overallLabel: string,
  mode: Mode
) {
  const compare = mode === "compare";
  const head = [
    "Screen brief",
    ...(mode === "run"
      ? ["Passed (first attempt → final)"]
      : ["Passed (final)", "Passed (first attempt)"]),
    "Errors",
    "Skipped",
    "Mean attempts (spec · code)",
    "Cost",
    "Wall time",
    ...gates,
  ];
  // One run's cells for some of its screen briefs.
  const cells = (run: ReportRun, slugs: string[]): string[] => {
    const reps = run.file.reps.filter((rep) => slugs.includes(rep.slug));
    const counts = tally(reps);
    const failures = gateFailures(reps);
    return [
      ...(mode === "run"
        ? [`${rate(counts.firstAttempt)} → ${rate(counts.final)}`]
        : [rate(counts.final), rate(counts.firstAttempt)]),
      String(counts.error),
      String(counts.skipped),
      meanAttempts(reps),
      // The judge's share, so a run from before gate 5 compares fairly.
      counts.gate5
        ? `${dollars(counts.cost)}, of which gate 5 ${dollars(counts.gate5.cost)}`
        : dollars(counts.cost),
      duration(counts.wallMs),
      ...gates.map((gate) => String(failures[gate])),
    ];
  };
  const row = (label: string, slugs: string[], isOverall: boolean) => {
    const [a, b] = runs.map((run) => cells(run, slugs)) as [
      string[],
      string[]?,
    ];
    const values = compare ? a.map((each, i) => `${each} → ${b![i]}`) : a;
    return `<tr${isOverall ? ' class="overall"' : ""}><th scope="row">${escapeHtml(label)}</th>${values
      .map((value) => `<td>${escapeHtml(value)}</td>`)
      .join("")}</tr>`;
  };
  const body = [
    ...briefs.map((brief) => row(brief, [brief], false)),
    row(overallLabel, briefs, true),
  ];
  return `<div class="table"><table class="summary">
<thead><tr>${head.map((cell) => `<th scope="col">${escapeHtml(cell)}</th>`).join("")}</tr></thead>
<tbody>
${body.join("\n")}
</tbody>
</table></div>`;
}

// Gate 5 (ADR 0014) beside the summary, never in it: per screen brief and
// overall, the reps judged out of those that passed or failed, then per
// criterion the judged reps whose every state passed it, of those it's
// decided in, the verdicts passed, the undecided criteria left out of both,
// and the judge's cost. A run without gate 5, or that judged none of these
// reps, reads not run, never zero. In a comparison every cell reads run A →
// run B, as the summary's do.
function gate5Table(
  runs: ReportRun[],
  briefs: string[],
  overallLabel: string,
  mode: Mode
) {
  const head = [
    "Screen brief",
    "Judged",
    ...rubricCriteria,
    "Score",
    "Undecided",
    "Cost",
  ];
  const notRun = "not run";
  const cells = (run: ReportRun, slugs: string[]): string[] => {
    const counts = tally(
      run.file.reps.filter((rep) => slugs.includes(rep.slug))
    ).gate5;
    if (!counts) return head.slice(1).map(() => notRun);
    const judged = counts.judged > 0;
    return [
      rate({ passed: counts.judged, of: counts.judged + counts.notRun }),
      ...rubricCriteria.map((criterion) =>
        judged ? rate(counts.criteria[criterion]) : notRun
      ),
      judged ? rate(counts.score) : notRun,
      judged ? String(counts.undecided) : notRun,
      dollars(counts.cost),
    ];
  };
  const row = (label: string, slugs: string[], isOverall: boolean) => {
    const [a, b] = runs.map((run) => cells(run, slugs)) as [
      string[],
      string[]?,
    ];
    const values =
      mode === "compare" ? a.map((each, i) => `${each} → ${b![i]}`) : a;
    return `<tr${isOverall ? ' class="overall"' : ""}><th scope="row">${escapeHtml(label)}</th>${values
      .map((value) => `<td>${escapeHtml(value)}</td>`)
      .join("")}</tr>`;
  };
  const body = [
    ...briefs.map((brief) => row(brief, [brief], false)),
    row(overallLabel, briefs, true),
  ];
  return `<div class="table"><table class="gate5">
<caption>Brief conformance (gate 5), soft</caption>
<thead><tr>${head.map((cell) => `<th scope="col">${escapeHtml(cell)}</th>`).join("")}</tr></thead>
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
      .filter((rep) => rep.slug === brief)
      .sort((a, b) => a.rep - b.rep)
      .map((rep) => repDetails(run, rep))
      .join("\n");
    return `<section class="brief">
<h3>${escapeHtml(brief)}</h3>
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
    ? `<p>Pass criteria missing: ${rep.criteria.missing.map((each) => escapeHtml(each)).join(", ")}</p>`
    : "";
  const conformance = rep.gate5 ? gate5Details(rep.gate5) : "";
  const attempts = rep.attempts
    .map((attempt) => {
      const gateList = Object.entries(attempt.gates)
        .map(
          ([gate, result]) =>
            `<li class="gate ${escapeHtml(result)}">${escapeHtml(gate)} ${escapeHtml(result)}</li>`
        )
        .join("");
      const failures = attempt.failures.length
        ? `<ul class="failures">${attempt.failures
            .map((line) => `<li><code>${escapeHtml(line)}</code></li>`)
            .join("")}</ul>`
        : "";
      const shots = run.shots?.get(shotKey(rep, attempt)) ?? [];
      const gallery = shots.length
        ? `<div class="shots">${shots
            .map(
              (each) =>
                `<figure><img src="${each.src}" alt="${escapeHtml(`${rep.slug} rep ${rep.rep}, ${attempt.step} attempt ${attempt.attempt}, ${each.theme} · ${each.state}`)}" loading="lazy"><figcaption>${escapeHtml(`${each.theme} · ${each.state}`)}</figcaption></figure>`
            )
            .join("")}</div>`
        : "";
      return `<li class="attempt"><p>${escapeHtml(attempt.step)} attempt ${attempt.attempt} · ${dollars(attempt.cost)}</p><ul class="gates">${gateList}</ul>${failures}${gallery}</li>`;
    })
    .join("");
  return `<details class="rep ${escapeHtml(rep.outcome)}"${rep.outcome === "pass" ? "" : " open"}>
<summary>rep ${rep.rep} · <strong>${escapeHtml(rep.outcome)}</strong> · ${escapeHtml(rep.endReason)} · ${dollars(rep.cost)} · ${duration(rep.wallMs)}</summary>
${missing}
${conformance}
<ol class="attempts">${attempts}</ol>
</details>`;
}

// A rep's gate 5: its score, with how many criteria were undecided, and
// each failing or uncounted verdict as a taste rule's finding reads (gate,
// state, criterion, reason), or why it didn't run and each state left
// unjudged.
function gate5Details(gate5: RepGate5) {
  const undecided = gate5.score ? rubricCriteria.length - gate5.score.of : 0;
  const head =
    gate5.ran && gate5.score
      ? `gate 5 · ${gate5.score.passed}/${gate5.score.of}${undecided ? ` · ${undecided} undecided` : ""} · soft · ${dollars(gate5.cost)}`
      : `gate 5 not run · ${gate5.notRun ?? ""}`;
  const lines = gate5.states.flatMap(findings);
  return `<p class="gate5">${escapeHtml(head)}</p>${
    lines.length
      ? `<ul class="failures">${lines
          .map((line) => `<li><code>${escapeHtml(line)}</code></li>`)
          .join("")}</ul>`
      : ""
  }`;
}

// Attempts per step, over the reps a pass rate counts that ran the step.
function meanAttempts(reps: RepResult[]) {
  return (["spec", "code"] as const)
    .map((step) => {
      const perRep = reps
        .filter(counted)
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

function duration(ms: number) {
  const seconds = Math.round(ms / 1000);
  return seconds < 60
    ? `${seconds}s`
    : `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
}

// tokens.css as the library ships it (its Tailwind-only blocks are at-rules
// a browser skips), the design brief's typeface inline, then the page's own
// rules. Those take every colour, space, radius, type and size from its
// variables. The few raw values left have no token: the 1px hairline (the
// library draws its own with Tailwind's `border`), the page's 1200px width
// and the screenshot column's 240px minimum, besides zeros and keywords.
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
  max-width: var(--ds-density-max-width-measure);
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
  border-top: var(--ds-size-height-edge) solid var(--ds-color-border-control);
  font-weight: var(--ds-type-weight-semibold);
}
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
.summary td, .gate5 td {
  text-align: right;
  font-variant-numeric: tabular-nums;
}
.table + .table { margin-top: var(--ds-space-xs); }
caption {
  padding: var(--ds-space-2xs) var(--ds-space-xs) 0;
  text-align: left;
  font-weight: var(--ds-density-text-label-font-weight);
}
p.gate5 { margin: var(--ds-space-3xs) 0 0; }
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
