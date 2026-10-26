// `generate(screenBrief, { workDir })`: one rep of the generator (ADR 0003,
// ADR 0010). The spec step turns the screen brief into a UI spec and gate 1
// checks it; the code step turns the UI spec into a TSX file and gates 2 and
// 3 and the static taste rules check that, then, if it builds, gate 4 and the
// render-time taste rules over every theme × screen state (render-gates.ts).
// Each step repairs only itself: a failing attempt's hard-gate failures go
// back to the same step as one repair turn (repair.ts), appended to its
// conversation, until it passes or runs out of attempts. A refusal, a
// max_tokens stop, an API error or a render pass that can't run ends the rep
// as an error, with no repair turn. Every attempt writes its folder under
// workDir.

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, relative, resolve, sep } from "node:path";
import type Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { generatorOutput } from "../lint/token/config.ts";
import { codeGates, type GateResult } from "./code-gates.ts";
import {
  cost,
  type Step,
  type StepConfig,
  stepConfig,
  type Usage,
} from "./config.ts";
import type { Failure, GateName } from "./failure.ts";
import {
  fixtureVariant,
  operationNames,
  variantNames,
} from "../src/fixtures/fixtures.ts";
import { type Gate1Fixtures, gate1 } from "./gate1.ts";
import type { Model } from "./model.ts";
import { codePrompt, specPrompt } from "./prompts.ts";
import { type LibraryRegistry, loadRegistry } from "./registry.ts";
import { type Render, type RenderPass, renderGates } from "./render-gates.ts";
import { repairTurn } from "./repair.ts";
import { pascalCase } from "./screen-stories.ts";
import type { ScreenBrief } from "./screen-brief.ts";
import { type UiSpec, wireSchema } from "./ui-spec.ts";
import { repo } from "../repo.ts";

// What gate 1 checks bindings, states and actions against.
const fixtures: Gate1Fixtures = {
  variants: Object.fromEntries(
    variantNames.map((name) => [name, fixtureVariant(name).data])
  ),
  operations: operationNames,
};

// An attempt's result for each gate its step has.
type Gates = Partial<Record<GateName, GateResult>>;

export type Attempt = {
  step: Step;
  // Counted within the step, from 1.
  attempt: number;
  gates: Gates;
  // As a repair turn sends them (ADR 0010): normalised, `+N more` counts
  // included.
  failures: string[];
  usage: Usage;
  // USD, from `usage` at the step's model's prices.
  cost: number;
  stopReason: Anthropic.Message["stop_reason"];
  requestId: string | null;
  wallMs: { model: number; gates: number };
  promptHash: string;
  // The code step's render pass, one per theme × screen state; empty when
  // the screen didn't build.
  renders?: Render[];
};

// How a rep ends (glossary: Rep), and why (ADR 0010).
export type Outcome = "pass" | "fail" | "error";
export type EndReason =
  | "passed"
  | "spec-attempts-exhausted"
  | "code-attempts-exhausted"
  | `error:${string}`;

// What a rep was generated with (ADR 0008's version tuple, less the git SHA
// and label, which only an eval run has).
export type Versions = {
  registryHash: string;
  specPromptHash: string;
  codePromptHash: string;
  spec: StepConfig;
  code: StepConfig;
};

export type RepTrace = {
  slug: string;
  workDir: string;
  versions: Versions;
  attempts: Attempt[];
  outcome: Outcome;
  endReason: EndReason;
  // The UI spec that passed gate 1, which pass criteria are checked on.
  uiSpec?: UiSpec;
  // The last code attempt's TSX, relative to workDir.
  screen?: string;
};

export type GenerateOptions = {
  workDir: string;
  model: Model;
  registry?: LibraryRegistry;
  // The code step's render pass. The real one builds Storybook and runs
  // Playwright in the pinned image (ADR 0009), so unit tests stand in a stub.
  render?: RenderPass;
  // Called as each attempt's gates finish, so a CLI can print as it goes.
  onAttempt?: (attempt: Attempt) => void;
};

export async function generate(
  brief: ScreenBrief,
  {
    workDir,
    model,
    registry: given,
    render = renderGates,
    onAttempt,
  }: GenerateOptions
): Promise<RepTrace> {
  const dir = resolve(workDir);
  // Token lint reaches generated screens only where the config looks for them.
  const where = relative(repo, dir) + sep;
  if (!generatorOutput.some((output) => where.startsWith(output))) {
    throw new Error(
      `workDir must sit under ${generatorOutput.join(" or ")} in the repo, so gate 2 applies: ${workDir}`
    );
  }
  mkdirSync(dir, { recursive: true });

  const registry = given ?? (await loadRegistry());
  const { type, schema, spec, code, versions } = prompts(registry);

  const trace: RepTrace = {
    slug: brief.slug,
    workDir: dir,
    versions,
    attempts: [],
    outcome: "pass",
    endReason: "passed",
  };
  const finish = (endReason: EndReason) => {
    trace.endReason = endReason;
    trace.outcome =
      endReason === "passed"
        ? "pass"
        : endReason.startsWith("error:")
          ? "error"
          : "fail";
    writeJson(join(dir, "rep.json"), trace);
    return trace;
  };
  const rep = { model, dir, trace, onAttempt };

  // The spec step. The request carries the wire schema as converted by
  // zodOutputFormat(), and gate 1 validates the reply against the same Zod
  // schema: that is messages.parse() in two halves, so a reply that doesn't
  // parse fails gate 1 by name instead of throwing.
  const specStep = await runStep(rep, {
    step: "spec",
    config: stepConfig.spec,
    system: spec.system,
    user: spec.user(brief),
    promptHash: spec.hash,
    outputConfig: { effort: stepConfig.spec.effort, format: { type, schema } },
    notRun: { "gate 1": "not-run" },
    gate: async (reply) => {
      const failures = gate1(reply, {
        entries: registry.entries,
        audience: brief.audience,
        fixtures,
      });
      return {
        gates: { "gate 1": failures.length ? "fail" : "pass" },
        failures,
        files: {
          "ui-spec.json": pretty(reply),
          "gates.json": json({ "gate 1": failures }),
        },
        output: failures.length
          ? undefined
          : wireSchema().parse(JSON.parse(reply)),
      };
    },
  });
  if ("error" in specStep) return finish(`error:${specStep.error}`);
  if (!specStep.output) return finish("spec-attempts-exhausted");
  const uiSpec = specStep.output;
  trace.uiSpec = uiSpec;

  // The code step: the UI spec and the screen brief in, a whole TSX file out,
  // a component named for its slug (`payment-status` → `PaymentStatus`).
  const name = pascalCase(brief.slug);
  const codeStep = await runStep(rep, {
    step: "code",
    config: stepConfig.code,
    system: code.system,
    user: code.user(brief, name, uiSpec),
    promptHash: code.hash,
    outputConfig: { effort: stepConfig.code.effort },
    notRun: {
      "gate 2": "not-run",
      "gate 3": "not-run",
      "gate 7 static": "not-run",
      "gate 4": "not-run",
      "gate 7 render": "not-run",
    },
    gate: async (reply, attemptDir, notRun) => {
      const tsx = extractTsx(reply);
      const screen = join(attemptDir, `${name}.tsx`);
      writeFileSync(screen, tsx);
      trace.screen = relative(dir, screen);
      const gated = await codeGates(
        screen,
        tsx,
        `src/screens/${brief.slug}/${name}.tsx`
      );
      const files = { "gates.json": json(gated.raw) };
      // Every gate that can run does (ADR 0010): the render pass runs
      // whatever gates 2 and 3 said, and only a failed build stops it.
      let rendered;
      try {
        rendered = await render({
          dir: attemptDir,
          slug: brief.slug,
          name,
          source: tsx,
          audience: brief.audience,
          states: uiSpec.states,
        });
      } catch (error) {
        console.error(error);
        return {
          gates: { ...notRun, ...gated.gates },
          failures: gated.failures,
          files,
          renders: [],
          error: "render",
        };
      }
      return {
        gates: {
          ...gated.gates,
          ...(rendered.built ? {} : { "gate 3": "fail" as const }),
          ...rendered.gates,
        },
        failures: [...gated.failures, ...rendered.failures],
        files,
        renders: rendered.renders,
        output: true,
      };
    },
  });
  if ("error" in codeStep) return finish(`error:${codeStep.error}`);
  return finish(codeStep.output ? "passed" : "code-attempts-exhausted");
}

// The version tuple every rep records, for a caller that needs it before any
// rep runs: an eval run's results file holds it once (ADR 0008).
export async function generatorVersions(
  registry?: LibraryRegistry
): Promise<Versions> {
  return prompts(registry ?? (await loadRegistry())).versions;
}

// Both steps' prompts, the spec step's output format, and the version tuple
// their hashes and the per-step config make up.
function prompts(registry: LibraryRegistry) {
  const designBrief = readFileSync(
    resolve(repo, "docs/design-brief.md"),
    "utf8"
  );
  const { type, schema } = zodOutputFormat(wireSchema(registry.component));
  const spec = specPrompt(
    designBrief,
    registry,
    JSON.stringify(schema, null, 2),
    fixtures.variants
  );
  const code = codePrompt(
    designBrief,
    registry,
    readFileSync(resolve(repo, "src/fixtures/types.ts"), "utf8")
  );
  const versions: Versions = {
    registryHash: registry.hash,
    specPromptHash: spec.hash,
    codePromptHash: code.hash,
    spec: stepConfig.spec,
    code: stepConfig.code,
  };
  return { type, schema, spec, code, versions };
}

type Rep = {
  model: Model;
  dir: string;
  trace: RepTrace;
  onAttempt?: (attempt: Attempt) => void;
};

type Gated<Output> = {
  gates: Gates;
  failures: Failure[];
  // Written into the attempt's folder.
  files: Record<string, string>;
  renders?: Render[];
  // What a passing attempt hands on.
  output?: Output;
  // The gates themselves couldn't run, which ends the rep.
  error?: string;
};

type StepInput<Output> = {
  step: Step;
  config: StepConfig;
  system: Anthropic.TextBlockParam[];
  user: string;
  promptHash: string;
  outputConfig: Anthropic.OutputConfig;
  notRun: Gates;
  gate: (
    reply: string,
    attemptDir: string,
    notRun: Gates
  ) => Promise<Gated<Output>>;
};

// One step's attempts: call, gate, and on a failure append the reply and a
// repair turn and call again, up to the step's attempt limit. A passing
// attempt's output comes back; none means the attempts ran out.
async function runStep<Output>(
  { model, dir, trace, onAttempt }: Rep,
  input: StepInput<Output>
): Promise<{ output?: Output } | { error: string }> {
  const { step, config, promptHash } = input;
  const messages: Anthropic.MessageParam[] = [
    { role: "user", content: input.user },
  ];
  for (let n = 1; ; n++) {
    const attemptDir = join(dir, `attempt-${n}-${step}`);
    mkdirSync(attemptDir, { recursive: true });
    const record = (attempt: Attempt, files: Record<string, string>) => {
      trace.attempts.push(attempt);
      for (const [file, content] of Object.entries(files)) {
        writeFileSync(join(attemptDir, file), content);
      }
      writeFileSync(
        join(attemptDir, "failures.txt"),
        attempt.failures.map((line) => line + "\n").join("")
      );
      writeJson(join(attemptDir, "attempt.json"), attempt);
      onAttempt?.(attempt);
    };

    const called = await call(model, {
      model: config.model,
      max_tokens: config.maxTokens,
      system: input.system,
      // A copy, so each request keeps the conversation as it was sent.
      messages: [...messages],
      output_config: input.outputConfig,
    });
    if ("error" in called) {
      record(
        buildAttempt(
          step,
          n,
          config,
          promptHash,
          input.notRun,
          called.response
        ),
        responseFile(called.response?.message)
      );
      return { error: called.error };
    }
    const { response } = called;

    const started = performance.now();
    const gated = await input.gate(
      text(response.message),
      attemptDir,
      input.notRun
    );
    const turn = repairTurn(step, gated.failures);
    const attempt: Attempt = {
      ...buildAttempt(step, n, config, promptHash, gated.gates, response),
      failures: turn.lines,
      wallMs: { model: response.modelMs, gates: performance.now() - started },
      ...(gated.renders ? { renders: gated.renders } : {}),
    };
    const passed = Object.values(gated.gates).every((gate) => gate === "pass");
    const repair =
      !gated.error && !passed && turn.lines.length && n < config.attempts;
    record(attempt, {
      ...gated.files,
      ...responseFile(response.message),
      ...(repair ? { "repair-turn.txt": turn.text + "\n" } : {}),
    });
    if (gated.error) return { error: gated.error };
    if (passed) return { output: gated.output };
    if (!repair) return {};
    messages.push(
      { role: "assistant", content: response.message.content },
      { role: "user", content: turn.text }
    );
  }
}

type Called = {
  message: Anthropic.Message;
  requestId: string | null;
  modelMs: number;
};

// A refusal, a max_tokens stop or an API error ends the rep as an error and
// never reaches a gate (ADR 0010).
async function call(
  model: Model,
  params: Anthropic.MessageCreateParamsNonStreaming
): Promise<{ response: Called } | { error: string; response?: Called }> {
  const started = performance.now();
  let reply;
  try {
    reply = await model(params);
  } catch (error) {
    console.error(error);
    return { error: "api" };
  }
  const response = { ...reply, modelMs: performance.now() - started };
  const stop = reply.message.stop_reason;
  if (stop === "refusal" || stop === "max_tokens")
    return { error: stop, response };
  return { response };
}

// An Attempt from its call alone: usage, cost and stop reason, with no
// failures yet. With no response, the call never returned.
function buildAttempt(
  step: Step,
  attempt: number,
  config: StepConfig,
  promptHash: string,
  gates: Gates,
  response?: Called
): Attempt {
  const logged = response?.message.usage;
  const usage = {
    input: logged?.input_tokens ?? 0,
    output: logged?.output_tokens ?? 0,
    cacheRead: logged?.cache_read_input_tokens ?? 0,
    cacheWrite: logged?.cache_creation_input_tokens ?? 0,
  };
  return {
    step,
    attempt,
    gates,
    failures: [],
    usage,
    cost: cost(config.model, usage),
    stopReason: response?.message.stop_reason ?? null,
    requestId: response?.requestId ?? null,
    wallMs: { model: response?.modelMs ?? 0, gates: 0 },
    promptHash,
  };
}

function text(message: Anthropic.Message) {
  return message.content
    .flatMap((block) => (block.type === "text" ? [block.text] : []))
    .join("");
}

// The file from its ```tsx fence, or the whole reply when it has none.
function extractTsx(reply: string) {
  const fenced = /```(?:tsx|typescript|ts)?\n([\s\S]*?)```/.exec(reply);
  return fenced ? fenced[1]! : reply;
}

// A reply as indented JSON, or as sent when it isn't JSON.
function pretty(reply: string) {
  try {
    return json(JSON.parse(reply));
  } catch {
    return reply;
  }
}

function responseFile(message?: Anthropic.Message): Record<string, string> {
  return message ? { "response.json": json(message) } : {};
}

// Every JSON file a rep writes: indented, with a final newline.
function json(value: unknown) {
  return JSON.stringify(value, null, 2) + "\n";
}

function writeJson(path: string, value: unknown) {
  writeFileSync(path, json(value));
}
