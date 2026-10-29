// Brief conformance, gate 5 (ADR 0014): Opus 5.5 judges each screen state's
// screenshot against six pass/fail criteria taken from the design brief, each
// verdict with a one-sentence reason that quotes it. The judge sees what a
// person sees, against what a person wrote: one light-theme screenshot per
// screen state at the audience's density, the design brief and the screen
// brief. Never the code or the UI spec.
//
// It's soft: nothing it says reaches a repair turn or a rep's outcome, and
// its failures aren't a GateName, so they can't. A call that errors, is
// refused, runs out of tokens or replies with verdicts that don't parse or
// don't quote the brief leaves its state unjudged, and the screen's gate 5
// not run. It runs in `pnpm generate` and eval runs, never in `pnpm gate`.

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

// The rubric, in the order the judge answers and the CLI prints it.
export const rubric = {
  hierarchy:
    "Hierarchy reads from size and weight: one clear title, then content.",
  density:
    "Density fits the audience: dense for the admin, roomy for the contractor.",
  accent: "The accent appears only on the primary action, selection and focus.",
  elevation: "A shadow means it floats, never just a box.",
  copy: "Copy is second person and specific; errors say what happened and what to do next.",
  repetition:
    'Nothing repeats itself: no card saying "Overdue" in its title, its tag and its text.',
} as const;

export type Criterion = keyof typeof rubric;
export const criteria = Object.keys(rubric) as Criterion[];

// One call per screen state. Thinking can't be turned off on Opus 5.5, so
// effort is set: high, since a verdict that flips between runs is worth less
// than the tokens.
export const judgeConfig = {
  model: "claude-opus-5-5",
  effort: "high",
  maxTokens: 16_000,
} as const;

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
  | { judged: true; verdicts: Verdict[]; passed: number }
  // `api`, `refusal`, `max_tokens`, or `malformed: <why>`.
  | { judged: false; error: string }
);

// A count of criteria passed, out of those judged.
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
  return {
    ran,
    states,
    score: ran
      ? {
          passed: states.reduce(
            (sum, state) => sum + (state.judged ? state.passed : 0),
            0
          ),
          of: states.length * criteria.length,
        }
      : null,
    cost: states.reduce((sum, state) => sum + (state.call?.cost ?? 0), 0),
    promptHash: prompt.hash,
  };
}

// The light-theme rest shot of each state the rep's final attempt rendered,
// at its audience's density: what gate 5 judges.
export function screenshotsOf(trace: RepTrace): Screenshot[] {
  return (trace.shots ?? [])
    .filter(({ theme }) => theme === "light")
    .map(({ state, file }) => ({
      state,
      png: readFileSync(resolve(trace.workDir, file)),
    }));
}

// The judge's half of a results file's version tuple (ADR 0008): its config
// and the hash of the rubric's and the design brief's words, as every
// Conformance it gives records it.
export function judgeVersions(designBrief = readDesignBrief()) {
  return { ...judgeConfig, promptHash: judgePrompt(designBrief).hash };
}

export type JudgeVersions = ReturnType<typeof judgeVersions>;

export function readDesignBrief() {
  return readFileSync(resolve(repo, "docs/design-brief.md"), "utf8");
}

const instructions = `You judge one screenshot of a generated product screen against the design brief below, the way a design lead reviews a screen: by looking at it. You see one screen state, rendered in the light theme at the density its audience gets. You never see its code.

Judge each of these six criteria on its own, pass or fail:

${criteria.map((criterion) => `- ${criterion}: ${rubric[criterion]}`).join("\n")}

For each criterion, write the reason first: one sentence saying what in the screenshot meets or breaks the criterion, which quotes the words of the design brief it rests on in double quotes, copied exactly from one line of the brief. Then pass: true when the screenshot meets the criterion, false when it doesn't. A criterion the screenshot gives nothing to judge, such as elevation on a screen with no shadow or error copy on a screen with no error, passes.

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
  };
}

// The reply's verdicts, checked by the schema and for a quote of the brief.
function parseVerdicts(
  reply: string,
  designBrief: string
): { verdicts: Verdict[] } | { error: string } {
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
  const list = criteria.map((criterion) => ({
    criterion,
    ...result.data[criterion],
  }));
  const unquoted = list.filter(
    ({ reason }) => !quotes(reason).some((quote) => brief.includes(quote))
  );
  if (unquoted.length) {
    return {
      error: `malformed: ${unquoted.map((v) => v.criterion).join(", ")} quote${unquoted.length === 1 ? "s" : ""} nothing in the design brief`,
    };
  }
  return { verdicts: list };
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
