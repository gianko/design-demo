// Brief conformance, gate 5 (ADR 0014): Opus 5.5 judges each screen state's
// screenshot against six pass/fail criteria taken from the design brief, each
// verdict with a one-sentence reason that quotes it. The judge sees what a
// person sees, against what a person wrote: one light-theme screenshot per
// screen state at the audience's density, the design brief and the screen
// brief. Never the code or the UI spec.
//
// It's hard (#347): a decided criterion that any state fails fails the rep
// (gate5Ending). It still sends no repair turn, and its failures aren't a
// GateName, so they can't. A call that errors, is refused, runs out of
// tokens or replies with verdicts that don't parse leaves its state
// unjudged, the screen's gate 5 not run, and a rep that would pass in
// error. A verdict whose reason quotes nothing in the brief isn't counted,
// and the state's other verdicts stand. It runs in `pnpm generate` and eval
// runs, never in `pnpm gate`.

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { cost, type Usage } from "./config.ts";
import type { RepTrace } from "./generate.ts";
import type { Model } from "./model.ts";
import type { ScreenBrief } from "./screen-brief.ts";
import { repo } from "../repo.ts";

// The rubric, in the order the judge answers and the CLI prints it. Each
// criterion is the design brief's own words, copied from its lines, so a
// reason that quotes the rubric quotes the brief (#341).
export const rubric = {
  hierarchy: ["hierarchy comes from size and weight, not from a second face."],
  density: [
    "density follows who's looking.",
    "Admin screens are dense.",
    "Contractor screens have room.",
  ],
  accent: ["a dusty berry for primary actions, selection and focus only."],
  elevation: ['A shadow means "this floats", never "this is a box".'],
  copy: [
    "Copy is second person, active and specific",
    "Errors say what happened and what to do next.",
  ],
  repetition: [
    'Say a thing once: a card doesn\'t repeat "Overdue" in its title, its tag and its text.',
  ],
} as const satisfies Record<string, readonly string[]>;

export type Criterion = keyof typeof rubric;
export const rubricCriteria = Object.keys(rubric) as Criterion[];

// One call per screen state. Thinking can't be turned off on Opus 5.5, so
// effort is set: high, since a verdict that flips between runs is worth less
// than the tokens.
export const judgeConfig = {
  model: "claude-opus-5-5",
  effort: "high",
  maxTokens: 16_000,
} as const;

// A guess at one judge call's cost, for an estimate made before any results
// prices it: a screenshot and a screen brief in, the rubric and the design
// brief read from the cache, and high effort's thinking and six verdicts
// out. About $0.069.
export const nominalJudgeCall = cost(judgeConfig.model, {
  input: 2_000,
  output: 3_000,
  cacheRead: 5_000,
  cacheWrite: 0,
});

// One screen state's light-theme shot at the audience's density.
export type Screenshot = { state: string; png: Buffer };

export type Verdict = { criterion: Criterion; pass: boolean; reason: string };

// One judge call's usage and cost, whatever it replied.
export type JudgeCall = {
  usage: Usage;
  // USD, at the judge's model's prices.
  cost: number;
  stopReason: Anthropic.Message["stop_reason"];
  requestId: string | null;
  wallMs: number;
};

export type StateJudgement = { state: string; call: JudgeCall | null } & (
  | {
      judged: true;
      // The verdicts counted: those whose reason quotes the design brief.
      verdicts: Verdict[];
      passed: number;
      // The verdicts whose reason quotes nothing in the design brief, kept
      // so a run shows why. They aren't counted. Absent from results files
      // from before #341.
      unquoted?: Verdict[];
    }
  // `api`, `refusal`, `max_tokens`, or `malformed: <why>`.
  | { judged: false; error: string }
);

// The criteria the screen passes, out of those decided: a screen passes a
// criterion when every state does (screenPasses), and an undecided one isn't
// counted.
export type Score = { passed: number; of: number };

export type Conformance = {
  // Every state judged. A screen with any state unjudged, or with no
  // screenshots, has gate 5 not run, and no score.
  ran: boolean;
  states: StateJudgement[];
  score: Score | null;
  // USD, every call's, judged or not.
  cost: number;
  // The rubric's and the design brief's words, for a results file's version
  // tuple (ADR 0008).
  promptHash: string;
};

export type JudgeInput = {
  brief: ScreenBrief;
  screenshots: Screenshot[];
  // docs/design-brief.md unless given.
  designBrief?: string;
};

export async function judgeScreen(
  { brief, screenshots, designBrief = readDesignBrief() }: JudgeInput,
  model: Model
): Promise<Conformance> {
  const prompt = judgePrompt(designBrief);
  const states = await Promise.all(
    screenshots.map((shot) =>
      judgeState(prompt, brief, shot, designBrief, model)
    )
  );
  const ran = states.length > 0 && states.every((state) => state.judged);
  const passes = rubricCriteria.map((criterion) =>
    screenPasses(states, criterion)
  );
  return {
    ran,
    states,
    score: ran
      ? {
          passed: passes.filter((pass) => pass === true).length,
          of: passes.filter((pass) => pass !== null).length,
        }
      : null,
    cost: states.reduce((sum, state) => sum + (state.call?.cost ?? 0), 0),
    promptHash: prompt.hash,
  };
}

// A screen passes a criterion when every state does, and fails it when any
// state does. Null when no state fails it but some state went unjudged or
// has no counted verdict on it, or when there are no states: it's
// undecided.
export function screenPasses(
  states: StateJudgement[],
  criterion: Criterion
): boolean | null {
  const verdicts = states.map((state) =>
    state.judged
      ? (state.verdicts.find((verdict) => verdict.criterion === criterion)
          ?.pass ?? null)
      : null
  );
  if (verdicts.includes(false)) return false;
  if (verdicts.length === 0 || verdicts.includes(null)) return null;
  return true;
}

// Gate 5 on a rep's final screen: its Conformance, with why it didn't run,
// or null when it did. The prompt hash is null when no state was sent.
export type Gate5 = Omit<Conformance, "promptHash"> & {
  notRun: string | null;
  promptHash: string | null;
};

// How gate 5 ends a rep: failed on a criterion, or in error because it
// couldn't judge.
export type Gate5EndReason = "gate5-failed" | "error:gate5";

// A rep's ending once gate 5 has judged its final screen, for a rep that
// passed or failed the other gates (ADR 0014). A decided criterion that any
// state fails fails a rep that would otherwise pass, with gate 5 as the end
// reason. Gate 5 not run, whatever the reason, is a tool failure, so it puts
// a rep that would pass in error, and a broken judge can't let a rep
// through. A rep another gate failed keeps its fail either way: it couldn't
// pass, and an error would hide the real failure. An undecided criterion
// fails nothing.
export function gate5Ending<Reason extends string>(
  ending: { outcome: "pass" | "fail"; endReason: Reason },
  gate5: Pick<Gate5, "ran" | "states">
): { outcome: "pass" | "fail" | "error"; endReason: Reason | Gate5EndReason } {
  if (!gate5.ran) {
    return ending.outcome === "fail"
      ? ending
      : { outcome: "error", endReason: "error:gate5" };
  }
  const failed = rubricCriteria.some(
    (criterion) => screenPasses(gate5.states, criterion) === false
  );
  return ending.outcome === "pass" && failed
    ? { outcome: "fail", endReason: "gate5-failed" }
    : ending;
}

// Gate 5 on a rep's final screen, as `pnpm generate` and eval runs judge it:
// the light shot of each state its final attempt rendered. A screen with no
// shots, or shots that can't be read, isn't judged, and anything else that
// stops the judge leaves it not run too. It never throws.
export async function judgeTrace(
  trace: RepTrace,
  brief: ScreenBrief,
  model: Model,
  designBrief?: string
): Promise<Gate5> {
  const notRun = (why: string): Gate5 => ({
    ran: false,
    notRun: why,
    states: [],
    score: null,
    cost: 0,
    promptHash: null,
  });
  let screenshots;
  try {
    screenshots = screenshotsOf(trace);
  } catch (error) {
    console.error(error);
    return notRun(`no screenshots: ${message(error)}`);
  }
  if (screenshots.length === 0) return notRun("no screenshots");
  try {
    const conformance = await judgeScreen(
      { brief, screenshots, designBrief },
      model
    );
    const unjudged = conformance.states.filter((state) => !state.judged);
    return {
      ...conformance,
      notRun: conformance.ran
        ? null
        : `${unjudged.length} of ${plural(conformance.states.length, "state")} unjudged`,
    };
  } catch (error) {
    console.error(error);
    return notRun(message(error));
  }
}

// A state's failing verdicts, then those not counted, or why it wasn't
// judged, each as a taste rule's finding reads: gate, state, criterion,
// reason.
export function findings(state: StateJudgement): string[] {
  if (!state.judged) {
    return [`gate 5 · ${state.state} · not run · ${state.error}`];
  }
  return [
    ...state.verdicts
      .filter(({ pass }) => !pass)
      .map(
        ({ criterion, reason }) =>
          `gate 5 · ${state.state} · ${criterion} · ${reason}`
      ),
    ...(state.unquoted ?? []).map(
      ({ criterion, reason }) =>
        `gate 5 · ${state.state} · ${criterion} · unquoted · ${reason}`
    ),
  ];
}

// `1 state`, `2 states`.
export function plural(n: number, word: string) {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}

function message(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

// The light-theme rest shot of each state the rep's final attempt rendered,
// at its audience's density: what gate 5 judges. Each shot's file is
// relative to workDir, or absolute.
export function screenshotsOf(
  trace: Pick<RepTrace, "shots" | "workDir">
): Screenshot[] {
  return (trace.shots ?? [])
    .filter(({ theme }) => theme === "light")
    .map(({ state, file }) => ({
      state,
      png: readFileSync(resolve(trace.workDir, file)),
    }));
}

// The judge's half of a results file's version tuple (ADR 0008): its config,
// the hash of the rubric's and the design brief's words, as every
// Conformance it gives records it, and that gate 5 was hard.
export function judgeVersions(designBrief = readDesignBrief()) {
  return {
    ...judgeConfig,
    promptHash: judgePrompt(designBrief).hash,
    hard: true as const,
  };
}

// Absent `hard` is a results file from before #347, when gate 5 was soft.
export type JudgeVersions = Omit<ReturnType<typeof judgeVersions>, "hard"> & {
  hard?: true;
};

export function readDesignBrief() {
  return readFileSync(resolve(repo, "docs/design-brief.md"), "utf8");
}

const instructions = `You judge one screenshot of a generated product screen against the design brief below, the way a design lead reviews a screen: by looking at it. You see one screen state, rendered in the light theme at the density its audience gets. You never see its code.

Judge each of these six criteria on its own, pass or fail:

${rubricCriteria.map((criterion) => `- ${criterion}:\n${rubric[criterion].map((words) => `  - ${words}`).join("\n")}`).join("\n")}

Each criterion is in the design brief's own words, copied from its lines. For each criterion, write the reason first: one sentence saying what in the screenshot meets or breaks the criterion, which quotes the words of the design brief it rests on in double quotes, copied exactly from one line of the brief, such as one of the criterion's own lines above. Then pass: true when the screenshot meets the criterion, false when it doesn't. A criterion the screenshot gives nothing to judge, such as elevation on a screen with no shadow or error copy on a screen with no error, passes.

Judge only what the screenshot shows. The screen brief says what the screen is for and who it's for; where it gives exact copy, that copy is the brief's to answer for, not the screen's.`;

const user =
  'This is the screen state "{state}" of the screen below, for the {audience}, at the {audience}\'s density.\n\n<screen_brief>\n{brief}\n</screen_brief>\n\nJudge the screenshot against the six criteria.';

const verdict = z.object({
  reason: z
    .string()
    .describe(
      "One sentence on what the screenshot shows, quoting the design brief in double quotes."
    ),
  pass: z.boolean(),
});

// One verdict per criterion, as named keys: structured outputs can't hold an
// array to exactly six.
const verdicts = z.object({
  hierarchy: verdict,
  density: verdict,
  accent: verdict,
  elevation: verdict,
  copy: verdict,
  repetition: verdict,
} satisfies Record<Criterion, typeof verdict>);

type JudgePrompt = {
  system: Anthropic.TextBlockParam[];
  format: Anthropic.JSONOutputFormat;
  hash: string;
};

function judgePrompt(designBrief: string): JudgePrompt {
  const { type, schema } = zodOutputFormat(verdicts);
  return {
    // One breakpoint, after the design brief, caches the prefix every state
    // and every screen shares.
    system: [
      { type: "text", text: instructions },
      {
        type: "text",
        text: `<design_brief>\n${designBrief}\n</design_brief>`,
        cache_control: { type: "ephemeral" },
      },
    ],
    format: { type, schema },
    hash: createHash("sha256")
      .update(JSON.stringify([instructions, user, designBrief]))
      .digest("hex"),
  };
}

async function judgeState(
  prompt: JudgePrompt,
  brief: ScreenBrief,
  shot: Screenshot,
  designBrief: string,
  model: Model
): Promise<StateJudgement> {
  const started = performance.now();
  let reply;
  try {
    reply = await model({
      model: judgeConfig.model,
      max_tokens: judgeConfig.maxTokens,
      system: prompt.system,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: "image/png",
                data: shot.png.toString("base64"),
              },
            },
            {
              type: "text",
              text: fill(user, {
                state: shot.state,
                audience: brief.audience,
                brief: brief.text,
              }),
            },
          ],
        },
      ],
      output_config: { effort: judgeConfig.effort, format: prompt.format },
    });
  } catch (error) {
    console.error(error);
    return { state: shot.state, call: null, judged: false, error: "api" };
  }
  const { message, requestId } = reply;
  const logged = message.usage;
  const usage = {
    input: logged.input_tokens,
    output: logged.output_tokens,
    cacheRead: logged.cache_read_input_tokens ?? 0,
    cacheWrite: logged.cache_creation_input_tokens ?? 0,
  };
  const call: JudgeCall = {
    usage,
    cost: cost(judgeConfig.model, usage),
    stopReason: message.stop_reason,
    requestId,
    wallMs: performance.now() - started,
  };
  if (message.stop_reason === "refusal" || message.stop_reason === "max_tokens")
    return {
      state: shot.state,
      call,
      judged: false,
      error: message.stop_reason,
    };
  const parsed = parseVerdicts(text(message), designBrief);
  if ("error" in parsed)
    return { state: shot.state, call, judged: false, error: parsed.error };
  return {
    state: shot.state,
    call,
    judged: true,
    verdicts: parsed.verdicts,
    passed: parsed.verdicts.filter((v) => v.pass).length,
    unquoted: parsed.unquoted,
  };
}

// The reply's verdicts, checked by the schema, and split by whether each
// reason quotes the brief (ADR 0014).
function parseVerdicts(
  reply: string,
  designBrief: string
): { verdicts: Verdict[]; unquoted: Verdict[] } | { error: string } {
  let json;
  try {
    json = JSON.parse(reply);
  } catch {
    return { error: "malformed: not JSON" };
  }
  const result = verdicts.safeParse(json);
  if (!result.success) {
    return {
      error: `malformed: ${z.prettifyError(result.error).replace(/\s+/g, " ")}`,
    };
  }
  const brief = normalise(designBrief);
  const list = rubricCriteria.map((criterion) => ({
    criterion,
    ...result.data[criterion],
  }));
  const quoted = ({ reason }: Verdict) =>
    quotes(reason).some((quote) => brief.includes(quote));
  return {
    verdicts: list.filter(quoted),
    unquoted: list.filter((verdict) => !quoted(verdict)),
  };
}

// The double-quoted spans of a reason, straight or curly, normalised.
function quotes(reason: string) {
  return [...reason.matchAll(/["“]([^"”]+)["”]/g)]
    .map((match) => normalise(match[1]!))
    .filter(Boolean);
}

// What a quote copied from the brief's markdown keeps: its words, not its
// emphasis, code ticks, curly apostrophes or line breaks.
function normalise(text: string) {
  return text
    .replace(/[*_`]/g, "")
    .replace(/[‘’]/g, "'")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function text(message: Anthropic.Message) {
  return message.content
    .flatMap((block) => (block.type === "text" ? [block.text] : []))
    .join("");
}

function fill(template: string, values: Record<string, string>) {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    Object.hasOwn(values, key) ? values[key]! : match
  );
}
