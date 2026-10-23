// @vitest-environment node
// One generate() run on the smoke brief with a stubbed model: one spec
// attempt, one code attempt, no repair. The code step's gates are the real
// ESLint config and tsc, so these tests are slow by design.

import { existsSync, readFileSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";
import { randomUUID } from "node:crypto";
import type Anthropic from "@anthropic-ai/sdk";
import { afterEach, describe, expect, it } from "vitest";
import { generate } from "./generate.ts";
import type { Model } from "./model.ts";
import { readScreenBrief } from "./screen-brief.ts";

const repo = resolve(import.meta.dirname, "..");
const brief = readScreenBrief(join(import.meta.dirname, "fixtures/smoke.md"));

const smokeSpec = {
  audience: "contractor",
  nodes: [
    {
      id: "screen",
      component: "Screen",
      parent: null,
      slot: null,
      props: [{ name: "audience", value: '"contractor"' }],
      when: [],
      action: null,
    },
    {
      id: "welcome",
      component: "Text",
      parent: "screen",
      slot: "body",
      props: [
        {
          name: "text",
          value: JSON.stringify(
            "Welcome back. Your invoices and payments will show up here."
          ),
        },
      ],
      when: [],
      action: null,
    },
  ],
  states: [],
  actions: [],
};

const smokeTsx = `import { Screen, Text } from "../../index.ts";

export function Smoke() {
  return (
    <Screen audience="contractor">
      <Text text="Welcome back. Your invoices and payments will show up here." />
    </Screen>
  );
}
`;

function message(
  text: string,
  stop_reason: Anthropic.Message["stop_reason"] = "end_turn"
): Anthropic.Message {
  return {
    id: "msg_stub",
    type: "message",
    role: "assistant",
    model: "claude-opus-5-5",
    content: [{ type: "text", text, citations: null }],
    stop_reason,
    stop_sequence: null,
    stop_details: null,
    container: null,
    usage: {
      input_tokens: 100,
      output_tokens: 50,
      cache_creation_input_tokens: 0,
      cache_read_input_tokens: 4000,
      cache_creation: null,
      inference_geo: null,
      output_tokens_details: null,
      server_tool_use: null,
      service_tier: null,
    },
  } as Anthropic.Message;
}

// Answers each call with the next reply, and keeps every request it got.
function stubModel(...replies: Anthropic.Message[]) {
  const requests: Anthropic.MessageCreateParamsNonStreaming[] = [];
  const model: Model = async (params) => {
    requests.push(params);
    const reply = replies.shift();
    if (!reply) throw new Error("the stub model ran out of replies");
    return { message: reply, requestId: `req_${requests.length}` };
  };
  return { model, requests };
}

const workDirs: string[] = [];
function workDir() {
  const dir = join(repo, ".generated", `vitest-${randomUUID()}`);
  workDirs.push(dir);
  return dir;
}
afterEach(() => {
  for (const dir of workDirs.splice(0))
    rmSync(dir, { recursive: true, force: true });
});

function readJson(path: string) {
  return JSON.parse(readFileSync(path, "utf8"));
}

describe("generate", () => {
  it("passes the smoke brief in one spec attempt and one code attempt", async () => {
    const { model } = stubModel(
      message(JSON.stringify(smokeSpec)),
      message("```tsx\n" + smokeTsx + "```")
    );
    const dir = workDir();

    const trace = await generate(brief, { workDir: dir, model });

    expect(trace.outcome).toBe("passed");
    expect(
      trace.attempts.map(({ step, attempt, gates }) => [step, attempt, gates])
    ).toEqual([
      ["spec", 1, { "gate 1": "pass" }],
      ["code", 1, { "gate 2": "pass", "gate 3": "pass", "gate 7": "pass" }],
    ]);
    expect(trace.uiSpec).toEqual(smokeSpec);
  }, 60_000);

  it("writes the attempt folders, with both prompt hashes recorded", async () => {
    const { model } = stubModel(
      message(JSON.stringify(smokeSpec)),
      message(smokeTsx)
    );
    const dir = workDir();

    const trace = await generate(brief, { workDir: dir, model });

    expect(readJson(join(dir, "attempt-1-spec/ui-spec.json"))).toEqual(
      smokeSpec
    );
    expect(readFileSync(join(dir, "attempt-1-code/Smoke.tsx"), "utf8")).toBe(
      smokeTsx
    );
    const rep = readJson(join(dir, "rep.json"));
    expect(rep.versions.specPromptHash).toMatch(/^[0-9a-f]{64}$/);
    expect(rep.versions.codePromptHash).toMatch(/^[0-9a-f]{64}$/);
    expect(rep.versions.specPromptHash).not.toBe(rep.versions.codePromptHash);
    expect(rep.versions.registryHash).toMatch(/^[0-9a-f]{64}$/);
    expect(rep.outcome).toBe("passed");
    expect(readJson(join(dir, "attempt-1-spec/attempt.json"))).toMatchObject({
      step: "spec",
      promptHash: rep.versions.specPromptHash,
      requestId: "req_1",
      stopReason: "end_turn",
      usage: { input: 100, output: 50, cacheRead: 4000, cacheWrite: 0 },
    });
    expect(readJson(join(dir, "attempt-1-code/attempt.json"))).toMatchObject({
      step: "code",
      promptHash: rep.versions.codePromptHash,
      requestId: "req_2",
    });
    expect(trace.versions).toEqual(rep.versions);
  }, 60_000);

  it("asks each step with its own config and the cached system prefix", async () => {
    const { model, requests } = stubModel(
      message(JSON.stringify(smokeSpec)),
      message(smokeTsx)
    );

    await generate(brief, { workDir: workDir(), model });

    const [spec, code] = requests;
    expect(spec).toMatchObject({
      model: "claude-opus-5-5",
      max_tokens: 32_000,
      output_config: { effort: "medium", format: { type: "json_schema" } },
    });
    expect(code).toMatchObject({
      model: "claude-opus-5-5",
      max_tokens: 64_000,
      output_config: { effort: "high" },
    });
    const system = spec!.system as Anthropic.TextBlockParam[];
    const prefix = system.map((block) => block.text).join("\n");
    // The design brief, the serialized registry and the wire schema, and
    // never an example UI spec.
    expect(prefix).toContain("# Design brief");
    expect(prefix).toContain('"name": "Text"');
    expect(prefix).toContain('"nodes"');
    expect(system.at(-1)!.cache_control).toEqual({ type: "ephemeral" });
    // The screen brief rides in the user turn, after the cached prefix.
    expect(JSON.stringify(spec!.messages)).toContain("Smoke: welcome back");
    expect(JSON.stringify(code!.messages)).toContain("Smoke: welcome back");
    const [turn] = code!.messages;
    expect(turn!.content).toContain(JSON.stringify(smokeSpec));
  }, 60_000);

  it("ends after a spec attempt that fails gate 1, without a code attempt", async () => {
    const broken = {
      ...smokeSpec,
      nodes: smokeSpec.nodes.map((node) =>
        node.id === "welcome" ? { ...node, component: "Paragraph" } : node
      ),
    };
    const { model, requests } = stubModel(message(JSON.stringify(broken)));
    const dir = workDir();

    const trace = await generate(brief, { workDir: dir, model });

    expect(trace.outcome).toBe("spec-attempts-exhausted");
    expect(requests).toHaveLength(1);
    expect(trace.attempts[0]!.failures).toEqual([
      'gate 1 · registered-component · welcome · "Paragraph" isn\'t a registered component.',
    ]);
    expect(
      readFileSync(join(dir, "attempt-1-spec/failures.txt"), "utf8")
    ).toContain("registered-component · welcome");
    expect(existsSync(join(dir, "attempt-1-code"))).toBe(false);
  }, 60_000);

  it("runs gates 2 and 3 and the static taste rules on the code attempt", async () => {
    const tsx = `import { Screen, Text } from "../../index.ts";

export function Smoke() {
  return (
    <Screen audience="contractor">
      <div>
        <Text text={42} />
      </div>
    </Screen>
  );
}
`;
    const { model } = stubModel(
      message(JSON.stringify(smokeSpec)),
      message(tsx)
    );

    const trace = await generate(brief, { workDir: workDir(), model });

    const code = trace.attempts[1]!;
    expect(trace.outcome).toBe("code-attempts-exhausted");
    expect(code.gates).toEqual({
      "gate 2": "fail",
      "gate 3": "fail",
      "gate 7": "pass",
    });
    expect(code.failures).toContainEqual(
      expect.stringMatching(/^gate 2 · no-restricted-syntax · L6:7 · /)
    );
    expect(code.failures).toContainEqual(
      expect.stringMatching(
        /^gate 3 · TS2322 · L7:15 · Type 'number' is not assignable to type 'string'/
      )
    );
  }, 60_000);

  it.each([
    ["refusal", "error:refusal"],
    ["max_tokens", "error:max_tokens"],
  ] as const)(
    "ends the rep as an error on a %s stop, without gating it",
    async (stop, outcome) => {
      const { model, requests } = stubModel(message("", stop));

      const trace = await generate(brief, { workDir: workDir(), model });

      expect(trace.outcome).toBe(outcome);
      expect(requests).toHaveLength(1);
      expect(trace.attempts[0]!.gates).toEqual({ "gate 1": "not-run" });
    },
    60_000
  );
});
