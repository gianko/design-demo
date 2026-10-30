// The calibration set and `pnpm evals:calibrate` (ADR 0014, glossary:
// Calibration set): the evidence that brief conformance can be trusted.
//
// The set is every kept screen as it is, and copies of kept screens, each
// broken by hand against one brief-conformance criterion. A copy sits in
// `evals/calibration/screens/<kept slug>--<criterion>/`, under its kept
// screen's file name, and renders with its kept screen's stories, so in the
// same states. It's never kept, baselined, captured or gated: it isn't
// under src/, and it has no stories of its own.
//
// The command renders each screen in the set once, as the render pass
// renders a generated screen, then judges each one three times with gate 5's
// judge, and writes a report of the verdicts it expected and got: how many
// were right and how many flipped between runs, overall and per criterion.
// It prints a cost estimate before it spends anything. Run by hand only.

import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { basename, dirname, join, relative, resolve, sep } from "node:path";
import { parseArgs } from "node:util";
import {
  judgeConfig,
  judgeScreen,
  nominalJudgeCall,
  rubricCriteria,
  screenPasses,
  screenshotsOf,
  type Conformance,
  type Criterion,
  type Screenshot,
  type StateJudgement,
} from "../generator/conformance.ts";
import type { Model } from "../generator/model.ts";
import { renderStories } from "../generator/render-gates.ts";
import { keptStoryStates } from "../generator/screen-stories.ts";
import {
  readScreenBrief,
  type ScreenBrief,
} from "../generator/screen-brief.ts";
import { day, dollars, stamp } from "../format.ts";
import { repo } from "../repo.ts";

// Each broken copy: the kept screen it copies, the one criterion it breaks
// and how.
export const brokenCopies: { kept: string; breaks: Criterion; how: string }[] =
  [
    {
      kept: "payment-status",
      breaks: "accent",
      how: "A second primary Button, Download invoice, beside Send reminder.",
    },
    {
      kept: "payment-status",
      breaks: "elevation",
      how: "The invoice's Card sits on a raised shadow.",
    },
    {
      kept: "bulk-pay",
      breaks: "copy",
      how: "The title says Streamline your payroll, not Pay invoices.",
    },
    {
      kept: "bulk-pay",
      breaks: "density",
      how: "The admin screen's Screen sets the contractor's density.",
    },
    {
      kept: "my-invoices",
      breaks: "hierarchy",
      how: "The title is muted body Text, not a level-1 Heading.",
    },
  ];

export type SetScreen = {
  // The kept screen's slug, or a copy's `<kept slug>--<criterion>`.
  id: string;
  kept: string;
  // The criterion a copy breaks, and how; null for a kept screen.
  breaks: Criterion | null;
  how: string | null;
  // The kept screen's screen brief, which the judge reads.
  brief: ScreenBrief;
  // The screen's component and file name, e.g. PaymentStatus.
  name: string;
  source: string;
  // The kept screen's stories, and the state each one renders.
  stories: string;
  states: string[];
};

const screensDir = join(repo, "src/screens");
const copiesDir = join(repo, "evals/calibration/screens");
const briefPath = (slug: string) => join(repo, "evals/briefs", `${slug}.md`);

// The kept screens are the folders in `screens` with a committed screen
// brief: a folder without one, such as one `pnpm keep`'s tests write while
// they run, isn't a kept screen.
export function calibrationSet(screens = screensDir): SetScreen[] {
  const kept = readdirSync(screens)
    .filter((slug) => existsSync(briefPath(slug)))
    .sort()
    .map((slug): SetScreen => {
      const dir = join(screens, slug);
      const stories = readdirSync(dir).find((file) =>
        file.endsWith(".stories.tsx")
      );
      if (!stories) throw new Error(`src/screens/${slug} has no stories.`);
      const name = basename(stories, ".stories.tsx");
      const storiesSource = readFileSync(join(dir, stories), "utf8");
      return {
        id: slug,
        kept: slug,
        breaks: null,
        how: null,
        brief: readScreenBrief(briefPath(slug)),
        name,
        source: readFileSync(join(dir, `${name}.tsx`), "utf8"),
        stories: storiesSource,
        states: keptStoryStates(storiesSource).map(({ state }) => state),
      };
    });
  const copies = brokenCopies.map(({ kept: slug, breaks, how }): SetScreen => {
    const original = kept.find((screen) => screen.kept === slug);
    if (!original) throw new Error(`${slug} isn't a kept screen.`);
    const id = `${slug}--${breaks}`;
    return {
      ...original,
      id,
      breaks,
      how,
      source: readFileSync(join(copiesDir, id, `${original.name}.tsx`), "utf8"),
    };
  });
  return [...kept, ...copies];
}

// One screen of the set through the render pass, at its brief's audience
// density, in a folder of its own; the light rest shot of each state, which
// gate 5 judges. Needs Docker, like the render pass.
export async function renderSetScreen(
  screen: SetScreen,
  dir: string
): Promise<Screenshot[]> {
  const result = await renderStories({
    dir,
    slug: screen.id,
    audience: screen.brief.audience,
    files: {
      [`${screen.name}.tsx`]: screen.source,
      [`${screen.name}.stories.tsx`]: screen.stories,
    },
    states: keptStoryStates(screen.stories),
  });
  if (!result.built) {
    throw new Error(
      `${screen.id} doesn't build: ${result.failures[0]?.message ?? "no output"}`
    );
  }
  return screenshotsOf({ shots: result.shots, workDir: dir });
}

// ── The command ───────────────────────────────────────────────────────────

// Every screen is judged this many times, on the same screenshots, so a
// verdict that changes between runs is the judge's.
export const runs = 3;

export type CalibrateDeps = {
  // One screen of the set rendered in `dir`: its light shot per state.
  render: (screen: SetScreen, dir: string) => Promise<Screenshot[]>;
  judge: Model;
  // Asked only when the estimate is over budget; false stops the run.
  confirm: (question: string) => Promise<boolean>;
  git: () => Promise<{ sha: string; dirty: boolean }>;
  log?: (line: string) => void;
  now?: () => Date;
  // Where each screen renders, in a folder per run.
  runsDir?: string;
};

const usage =
  "Usage: pnpm evals:calibrate [--out <report.md>] [--budget <usd>|none] [--estimate]";

export async function main(
  argv: string[],
  deps: CalibrateDeps
): Promise<number> {
  const log = deps.log ?? console.log;
  const now = deps.now ?? (() => new Date());
  const args = parse(argv);
  if (typeof args === "string") {
    log(args);
    log(usage);
    return 2;
  }

  const set = calibrationSet();
  const states = set.reduce((sum, screen) => sum + screen.states.length, 0);
  // At eval runs' nominal judge call; the Console spend limit stays the
  // backstop.
  const estimate = states * runs * nominalJudgeCall;
  log(
    `estimate: ${dollars(estimate)} (${set.length} screens, ${states} screen states × ${runs} runs × ${dollars(nominalJudgeCall, 3)} a nominal judge call), budget ${args.budget === null ? "none" : dollars(args.budget)}`
  );
  if (args.estimate) return 0;
  if (
    args.budget !== null &&
    estimate > args.budget &&
    !(await deps.confirm(
      `The estimate of ${dollars(estimate)} is over the ${dollars(args.budget)} budget. Run anyway?`
    ))
  ) {
    log("Not run.");
    return 1;
  }

  const started = now();
  const git = await deps.git();
  const runDir = join(
    deps.runsDir ?? join(repo, ".generated", "calibration"),
    stamp(started)
  );

  // Rendered once, so every run judges the same screenshots.
  const shots = new Map<string, Screenshot[]>();
  for (const screen of set) {
    try {
      const rendered = await deps.render(screen, join(runDir, screen.id));
      log(`rendered ${screen.id} · ${rendered.length} states`);
      shots.set(screen.id, rendered);
    } catch (error) {
      console.error(error);
      log(`rendered ${screen.id} · failed, so it's not judged`);
      shots.set(screen.id, []);
    }
  }

  const judged: Judged[] = set.map((screen) => ({ screen, runs: [] }));
  for (let run = 1; run <= runs; run++) {
    for (const entry of judged) {
      const conformance = await judgeScreen(
        { brief: entry.screen.brief, screenshots: shots.get(entry.screen.id)! },
        deps.judge
      );
      entry.runs.push(conformance);
      log(runLine(run, entry.screen, conformance));
    }
  }

  const tally = tallyOf(judged);
  mkdirSync(dirname(args.out), { recursive: true });
  writeFileSync(
    args.out,
    report(judged, tally, { started, git, cost: totalCost(judged) })
  );
  log(
    `right verdicts: ${share(tally.all.right)} · flipped: ${share(tally.all.flipped)} · cost ${dollars(totalCost(judged))}`
  );
  log(
    `wrote ${args.out.startsWith(repo + sep) ? relative(repo, args.out) : args.out}`
  );
  return 0;
}

type Judged = { screen: SetScreen; runs: Conformance[] };

// A screen's verdict on one criterion in one run, as gate 5 gives it
// (screenPasses): fail when any state fails it, pass when every state passes
// it, and undecided when no state fails it but some state went unjudged or
// quoted nothing in the brief for it. Its reasons are those of each state
// that failed it, or of the first state when it passed, or why each state
// left it undecided.
type ScreenVerdict = {
  pass: boolean | null;
  reasons: { state: string; reason: string }[];
};

type Judgement = Extract<StateJudgement, { judged: true }>;

function screenVerdict(
  conformance: Conformance,
  criterion: Criterion
): ScreenVerdict {
  const pass = screenPasses(conformance.states, criterion);
  const judged = conformance.states.filter(
    (state): state is Judgement => state.judged
  );
  const verdictOf = (state: Judgement) =>
    state.verdicts.find((verdict) => verdict.criterion === criterion);
  const reasonOf = (state: Judgement) => ({
    state: state.state,
    reason: verdictOf(state)!.reason,
  });
  if (pass === false) {
    return {
      pass,
      reasons: judged
        .filter((state) => verdictOf(state)?.pass === false)
        .map(reasonOf),
    };
  }
  if (pass === true) return { pass, reasons: [reasonOf(judged[0]!)] };
  const undecided = conformance.states.flatMap((state) => {
    if (!state.judged) return [{ state: state.state, reason: state.error }];
    return (state.unquoted ?? [])
      .filter((verdict) => verdict.criterion === criterion)
      .map((verdict) => ({
        state: state.state,
        reason: `unquoted · ${verdict.reason}`,
      }));
  });
  return {
    pass,
    reasons: undecided.length
      ? undecided
      : [{ state: "(screen)", reason: "no screenshots" }],
  };
}

// The verdict a screen should get: a kept screen passes every criterion,
// and a copy fails only the one it breaks.
const expected = (screen: SetScreen, criterion: Criterion) =>
  screen.breaks !== criterion;

type Count = { n: number; of: number };

type Tally = {
  // Per criterion, then over all of them: verdicts that matched the
  // expected one, of those judged; screens whose judged verdicts on it
  // differ between runs, of those judged in two runs or more; and verdicts
  // undecided.
  byCriterion: Record<Criterion, { right: Count; flipped: Count }>;
  all: { right: Count; flipped: Count; undecided: number };
};

function tallyOf(judged: Judged[]): Tally {
  const zero = () => ({ right: { n: 0, of: 0 }, flipped: { n: 0, of: 0 } });
  const all = { ...zero(), undecided: 0 };
  const byCriterion = Object.fromEntries(
    rubricCriteria.map((criterion) => [criterion, zero()])
  ) as Tally["byCriterion"];
  for (const { screen, runs: conformances } of judged) {
    for (const criterion of rubricCriteria) {
      const verdicts = conformances
        .map((conformance) => screenVerdict(conformance, criterion).pass)
        .filter((pass): pass is boolean => pass !== null);
      all.undecided += conformances.length - verdicts.length;
      const right = verdicts.filter(
        (pass) => pass === expected(screen, criterion)
      ).length;
      for (const count of [byCriterion[criterion], all]) {
        count.right.n += right;
        count.right.of += verdicts.length;
        if (verdicts.length >= 2) {
          count.flipped.of += 1;
          if (new Set(verdicts).size > 1) count.flipped.n += 1;
        }
      }
    }
  }
  return { byCriterion, all };
}

const totalCost = (judged: Judged[]) =>
  judged.reduce(
    (sum, { runs: conformances }) =>
      sum + conformances.reduce((each, { cost }) => each + cost, 0),
    0
  );

// `142/144 (99%)`.
function share({ n, of }: Count) {
  return of === 0 ? "none" : `${n}/${of} (${Math.round((100 * n) / of)}%)`;
}

const verdictWord = (pass: boolean | null) =>
  pass === null ? "undecided" : pass ? "pass" : "fail";

function runLine(run: number, screen: SetScreen, conformance: Conformance) {
  const verdicts = rubricCriteria
    .map(
      (criterion) =>
        `${criterion} ${verdictWord(screenVerdict(conformance, criterion).pass)}`
    )
    .join(" · ");
  return `run ${run} · ${screen.id} · ${verdicts} · ${dollars(conformance.cost)}`;
}

function report(
  judged: Judged[],
  tally: Tally,
  meta: { started: Date; git: { sha: string; dirty: boolean }; cost: number }
) {
  const copies = judged.filter(({ screen }) => screen.breaks !== null).length;
  const states = judged.reduce(
    (sum, { screen }) => sum + screen.states.length,
    0
  );
  const promptHash = judged[0]?.runs[0]?.promptHash ?? "";
  const lines = [
    "# Brief conformance calibration",
    "",
    `Written by \`pnpm evals:calibrate\` (ADR 0014) on ${day(meta.started)}, at \`${meta.git.sha.slice(0, 7)}\`${meta.git.dirty ? " with uncommitted changes" : ""}. The judge is ${judgeConfig.model} at effort ${judgeConfig.effort}, prompt \`${promptHash.slice(0, 12)}\`. The calibration set's ${judged.length} screens, ${judged.length - copies} kept screens as they are and ${copies} broken copies, have ${states} screen states, and each was judged ${runs} times. It cost ${dollars(meta.cost)}.`,
    "",
    "## Right verdicts and flips",
    "",
    "A screen's verdict on a criterion in one run fails when any of its states fails it. It's right when a kept screen passes, and when a broken copy fails the criterion it breaks and passes the rest. A screen's criterion flipped when its verdicts differ between runs.",
    "",
    "| Criterion | Right | Flipped |",
    "| --- | --- | --- |",
    ...rubricCriteria.map(
      (criterion) =>
        `| ${criterion} | ${share(tally.byCriterion[criterion].right)} | ${share(tally.byCriterion[criterion].flipped)} |`
    ),
    `| **All** | ${share(tally.all.right)} | ${share(tally.all.flipped)} |`,
  ];
  if (tally.all.undecided > 0) {
    lines.push(
      "",
      `${tally.all.undecided} verdict${tally.all.undecided === 1 ? "" : "s"} undecided, and left out of both: the judge didn't answer for a state, or its reason quoted nothing in the design brief, and no other state failed the criterion.`
    );
  }
  for (const { screen, runs: conformances } of judged) {
    lines.push(
      "",
      `## ${screen.id}`,
      "",
      screen.breaks === null
        ? "Kept, as it is."
        : `Breaks ${screen.breaks}: ${screen.how}`,
      "",
      `States: ${screen.states.join(" · ")}.`,
      "",
      `| Criterion | Expected | ${conformances.map((_, i) => `Run ${i + 1}`).join(" | ")} |`,
      `| --- | --- | ${conformances.map(() => "---").join(" | ")} |`,
      ...rubricCriteria.map(
        (criterion) =>
          `| ${criterion} | ${verdictWord(expected(screen, criterion))} | ${conformances
            .map((conformance) =>
              verdictWord(screenVerdict(conformance, criterion).pass)
            )
            .join(" | ")} |`
      ),
      ""
    );
    for (const criterion of rubricCriteria) {
      conformances.forEach((conformance, i) => {
        const { pass, reasons } = screenVerdict(conformance, criterion);
        for (const { state, reason } of reasons) {
          lines.push(
            `- ${criterion} · run ${i + 1} · ${verdictWord(pass)} · ${state}: ${reason}`
          );
        }
      });
    }
  }
  return lines.join("\n") + "\n";
}

// `estimate` prints the estimate and stops: a look at the cost first.
type Args = { out: string; budget: number | null; estimate: boolean };

function parse(argv: string[]): Args | string {
  let values;
  try {
    ({ values } = parseArgs({
      args: argv,
      options: {
        out: { type: "string", default: "evals/calibration/report.md" },
        budget: { type: "string", default: "10" },
        estimate: { type: "boolean", default: false },
      },
    }));
  } catch (error) {
    return (error as Error).message;
  }
  const budget = values.budget === "none" ? null : Number(values.budget);
  if (budget !== null && !(budget >= 0))
    return `--budget must be dollars or none: ${values.budget}`;
  return { out: resolve(repo, values.out), budget, estimate: values.estimate };
}
