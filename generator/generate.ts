// `generate(screenBrief, { workDir })`: one rep of the generator (ADR 0003,
// ADR 0010). The spec step turns the screen brief into a UI spec and gate 1
// checks it; the code step turns the UI spec into a TSX file and gates 2 and
// 3 and the static taste rules check that, then, if it builds, gate 4 and the
// render-time taste rules over every theme × screen state (render-gates.ts).
// A render pass that can't run ends the rep as `error:render`. One attempt
// per step for now: the repair loop joins later. Every attempt writes its
// folder under workDir.

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, relative, resolve, sep } from "node:path";
import type Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { generatorOutput } from "../lint/token/config.ts";
import { codeGates, type GateResult } from "./code-gates.ts";
import { type StepConfig, stepConfig } from "./config.ts";
import { type Failure, failureLine } from "./failure.ts";
import {
  fixtureVariant,
  operationNames,
  variantNames,
} from "../src/fixtures/fixtures.ts";
import { type Gate1Fixtures, gate1 } from "./gate1.ts";
import type { Model } from "./model.ts";
import { codePrompt, specPrompt } from "./prompts.ts";
import { type LibraryRegistry, loadRegistry } from "./registry.ts";
import { type Render, renderGates } from "./render-gates.ts";
import { pascalCase } from "./screen-stories.ts";
import type { ScreenBrief } from "./screen-brief.ts";
import { type UiSpec, wireSchema } from "./ui-spec.ts";

const repo = resolve(import.meta.dirname, "..");

// What gate 1 checks bindings, states and actions against.
const fixtures: Gate1Fixtures = {
  variants: Object.fromEntries(
    variantNames.map((name) => [name, fixtureVariant(name).data])
  ),
  operations: operationNames,
};

export type Step = "spec" | "code";

export type Attempt = {
  step: Step;
  attempt: number;
  gates: Record<string, GateResult>;
  // As a repair turn would send them (ADR 0010).
  failures: string[];
  usage: {
    input: number;
    output: number;
    cacheRead: number;
    cacheWrite: number;
  };
  stopReason: Anthropic.Message["stop_reason"];
  requestId: string | null;
  wallMs: { model: number; gates: number };
  promptHash: string;
  // The code step's render pass, one per theme × screen state; empty when
  // the screen didn't build.
  renders?: Render[];
};

export type Outcome =
  | "passed"
  | "spec-attempts-exhausted"
  | "code-attempts-exhausted"
  | `error:${string}`;

export type RepTrace = {
  slug: string;
  workDir: string;
  versions: {
    registryHash: string;
    specPromptHash: string;
    codePromptHash: string;
    spec: StepConfig;
    code: StepConfig;
  };
  attempts: Attempt[];
  outcome: Outcome;
  // The last UI spec that passed gate 1, which pass criteria are checked on.
  uiSpec?: UiSpec;
  // The final TSX's path, relative to workDir.
  screen?: string;
};

export type GenerateOptions = {
  workDir: string;
  model: Model;
  registry?: LibraryRegistry;
  // Called as each attempt's gates finish, so a CLI can print as it goes.
  onAttempt?: (attempt: Attempt) => void;
};

export async function generate(
  brief: ScreenBrief,
  { workDir, model, registry: given, onAttempt }: GenerateOptions
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
  const designBrief = readFileSync(
    resolve(repo, "docs/design-brief.md"),
    "utf8"
  );
  const { type, schema } = zodOutputFormat(wireSchema(registry.component));
  const spec = specPrompt(
    designBrief,
    registry,
    JSON.stringify(schema, null, 2)
  );
  const code = codePrompt(designBrief, registry);

  const trace: RepTrace = {
    slug: brief.slug,
    workDir: dir,
    versions: {
      registryHash: registry.hash,
      specPromptHash: spec.hash,
      codePromptHash: code.hash,
      spec: stepConfig.spec,
      code: stepConfig.code,
    },
    attempts: [],
    outcome: "passed",
  };
  const finish = (outcome: Outcome) => {
    trace.outcome = outcome;
    writeJson(join(dir, "rep.json"), trace);
    return trace;
  };
  const record = (
    attempt: Attempt,
    attemptDir: string,
    files: Record<string, string>
  ) => {
    trace.attempts.push(attempt);
    for (const [name, content] of Object.entries(files)) {
      writeFileSync(join(attemptDir, name), content);
    }
    writeFileSync(
      join(attemptDir, "failures.txt"),
      attempt.failures.join("\n") + "\n"
    );
    writeJson(join(attemptDir, "attempt.json"), attempt);
    onAttempt?.(attempt);
  };

  // The spec step. The request carries the wire schema as converted by
  // zodOutputFormat(), and gate 1 validates the reply against the same Zod
  // schema: that is messages.parse() in two halves, so a reply that doesn't
  // parse fails gate 1 by name instead of throwing.
  const specDir = join(dir, "attempt-1-spec");
  mkdirSync(specDir, { recursive: true });
  const specCall = await call(model, {
    ...request(stepConfig.spec, spec.system, spec.user(brief)),
    output_config: { effort: stepConfig.spec.effort, format: { type, schema } },
  });
  if ("error" in specCall) {
    record(
      empty("spec", spec.hash, { "gate 1": "not-run" }, specCall.response),
      specDir,
      responseFile(specCall.response?.message)
    );
    return finish(`error:${specCall.error}`);
  }
  const specText = text(specCall.response.message);
  const started = performance.now();
  const specFailures = gate1(specText, {
    entries: registry.entries,
    audience: brief.audience,
    fixtures,
  });
  const specAttempt = attempt("spec", spec.hash, specCall, {
    gates: { "gate 1": specFailures.length ? "fail" : "pass" },
    failures: specFailures,
    gatesMs: performance.now() - started,
  });
  record(specAttempt, specDir, {
    "ui-spec.json": pretty(specText),
    "gates.json": JSON.stringify({ "gate 1": specFailures }, null, 2) + "\n",
    ...responseFile(specCall.response.message),
  });
  if (specFailures.length) return finish("spec-attempts-exhausted");
  const uiSpec = wireSchema().parse(JSON.parse(specText));
  trace.uiSpec = uiSpec;

  // The code step: the UI spec and the screen brief in, a whole TSX file out.
  const name = componentName(brief.slug);
  const codeDir = join(dir, "attempt-1-code");
  mkdirSync(codeDir, { recursive: true });
  const codeCall = await call(model, {
    ...request(stepConfig.code, code.system, code.user(brief, name, uiSpec)),
    output_config: { effort: stepConfig.code.effort },
  });
  const notRun = {
    "gate 2": "not-run",
    "gate 3": "not-run",
    "gate 7 static": "not-run",
    "gate 4": "not-run",
    "gate 7 render": "not-run",
  } as const;
  if ("error" in codeCall) {
    record(
      empty("code", code.hash, notRun, codeCall.response),
      codeDir,
      responseFile(codeCall.response?.message)
    );
    return finish(`error:${codeCall.error}`);
  }
  const tsx = extractTsx(text(codeCall.response.message));
  const screen = join(codeDir, `${name}.tsx`);
  writeFileSync(screen, tsx);
  trace.screen = relative(dir, screen);
  const gatesStarted = performance.now();
  const gated = await codeGates(
    screen,
    tsx,
    `src/screens/${brief.slug}/${name}.tsx`
  );
  // Every gate that can run does (ADR 0010): the render pass runs whatever
  // gates 2 and 3 said, and only a failed build stops it.
  let rendered;
  try {
    rendered = await renderGates({
      dir: codeDir,
      slug: brief.slug,
      name,
      source: tsx,
      audience: brief.audience,
      states: uiSpec.states,
    });
  } catch (error) {
    console.error(error);
    record(
      {
        ...attempt("code", code.hash, codeCall, {
          gates: { ...notRun, ...gated.gates },
          failures: gated.failures,
          gatesMs: performance.now() - gatesStarted,
        }),
        renders: [],
      },
      codeDir,
      responseFile(codeCall.response.message)
    );
    return finish("error:render");
  }
  const gates = {
    ...gated.gates,
    ...(rendered.built ? {} : { "gate 3": "fail" as const }),
    ...rendered.gates,
  };
  const codeAttempt: Attempt = {
    ...attempt("code", code.hash, codeCall, {
      gates,
      failures: [...gated.failures, ...rendered.failures],
      gatesMs: performance.now() - gatesStarted,
    }),
    renders: rendered.renders,
  };
  record(codeAttempt, codeDir, {
    "gates.json": JSON.stringify(gated.raw, null, 2) + "\n",
    ...responseFile(codeCall.response.message),
  });
  const passed = Object.values(gates).every((result) => result === "pass");
  return finish(passed ? "passed" : "code-attempts-exhausted");
}

// `payment-status` → `PaymentStatus`.
export function componentName(slug: string) {
  return pascalCase(slug);
}

function request(
  config: StepConfig,
  system: Anthropic.TextBlockParam[],
  user: string
): Anthropic.MessageCreateParamsNonStreaming {
  return {
    model: config.model,
    max_tokens: config.maxTokens,
    system,
    messages: [{ role: "user", content: user }],
  };
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

function attempt(
  step: Step,
  promptHash: string,
  { response }: { response: Called },
  result: {
    gates: Record<string, GateResult>;
    failures: Failure[];
    gatesMs: number;
  }
): Attempt {
  return {
    ...empty(step, promptHash, result.gates, response),
    failures: result.failures.map(failureLine),
    wallMs: { model: response.modelMs, gates: result.gatesMs },
  };
}

function empty(
  step: Step,
  promptHash: string,
  gates: Record<string, GateResult>,
  response?: Called
): Attempt {
  const usage = response?.message.usage;
  return {
    step,
    attempt: 1,
    gates,
    failures: [],
    usage: {
      input: usage?.input_tokens ?? 0,
      output: usage?.output_tokens ?? 0,
      cacheRead: usage?.cache_read_input_tokens ?? 0,
      cacheWrite: usage?.cache_creation_input_tokens ?? 0,
    },
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

function pretty(json: string) {
  try {
    return JSON.stringify(JSON.parse(json), null, 2) + "\n";
  } catch {
    return json;
  }
}

function responseFile(message?: Anthropic.Message): Record<string, string> {
  return message
    ? { "response.json": JSON.stringify(message, null, 2) + "\n" }
    : {};
}

function writeJson(path: string, value: unknown) {
  writeFileSync(path, JSON.stringify(value, null, 2) + "\n");
}
