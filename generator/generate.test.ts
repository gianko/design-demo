// @vitest-environment node
// generate() on the smoke brief with a stubbed model. The code step's gates
// 2 and 3 and static taste rules are the real ESLint config and tsc, so these
// tests are slow by design. The render pass is stubbed, since the real one
// needs Docker (ADR 0009); generator/render-gates.e2e.ts runs it for real.

import { existsSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import type Anthropic from "@anthropic-ai/sdk";
import { afterEach, describe, expect, it } from "vitest";
import { generate } from "./generate.ts";
import type { Model } from "./model.ts";
import type { RenderInput, RenderPass } from "./render-gates.ts";
import { readScreenBrief } from "./screen-brief.ts";
import { repo } from "../repo.ts";

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

// The render pass, stubbed. It renders light and dark × the default and
// every declared state at the audience's density, as the real one does. A
// screen with an unnamed `<button>` fails axe's button-name in each render;
// any other screen passes. A source that imports a module that doesn't exist
// doesn't build. It keeps every input it got.
const renderInputs: RenderInput[] = [];
const render: RenderPass = async (input) => {
  renderInputs.push(input);
  if (input.source.includes("no-such-module")) {
    return {
      built: false,
      gates: { "gate 4": "not-run", "gate 7 render": "not-run" },
      renders: [],
      failures: [
        {
          gate: "gate 3",
          rule: "build",
          location: "(build)",
          message: "Could not resolve ../../no-such-module.ts",
        },
      ],
    };
  }
  const unnamed = input.source.includes('<button type="button"></button>');
  const result = unnamed ? "fail" : "pass";
  const gates = { "gate 4": result, "gate 7 render": "pass" } as const;
  const renders = ["default", ...input.states.map(({ name }) => name)].flatMap(
    (state) =>
      (["light", "dark"] as const).map((theme) => ({
        theme,
        density: input.audience,
        state,
        gates,
      }))
  );
  return {
    built: true,
    gates,
    renders,
    failures: unnamed
      ? renders.map(({ theme, state }) => ({
          gate: "gate 4",
          rule: "button-name",
          location: 'button[type="button"] <button type="button"></button>',
          message: "Buttons must have discernible text",
          help: "Buttons must have discernible text",
          renders: [`${theme} · ${state}`],
        }))
      : [],
  };
};

const workDirs: string[] = [];
function workDir() {
  const dir = join(repo, ".generated", `vitest-${randomUUID()}`);
  workDirs.push(dir);
  return dir;
}
afterEach(() => {
  renderInputs.splice(0);
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

    const trace = await generate(brief, { workDir: dir, model, render });

    expect(trace.endReason).toBe("passed");
    expect(
      trace.attempts.map(({ step, attempt, gates }) => [step, attempt, gates])
    ).toEqual([
      ["spec", 1, { "gate 1": "pass" }],
      [
        "code",
        1,
        {
          "gate 2": "pass",
          "gate 3": "pass",
          "gate 7 static": "pass",
          "gate 4": "pass",
          "gate 7 render": "pass",
        },
      ],
    ]);
    expect(trace.uiSpec).toEqual(smokeSpec);
  }, 120_000);

  it("hands the render pass the attempt's TSX, audience and screen states, and records its renders", async () => {
    const withState = {
      ...smokeSpec,
      states: [{ name: "empty", fixture: "payment-status/empty" }],
    };
    const { model } = stubModel(
      message(JSON.stringify(withState)),
      message(smokeTsx)
    );
    const dir = workDir();

    const trace = await generate(brief, { workDir: dir, model, render });

    expect(renderInputs).toEqual([
      {
        dir: join(dir, "attempt-1-code"),
        slug: "smoke",
        name: "Smoke",
        source: smokeTsx,
        audience: "contractor",
        states: withState.states,
      },
    ]);
    const passed = { "gate 4": "pass", "gate 7 render": "pass" };
    expect(trace.attempts[1]!.renders).toEqual(
      [
        ["light", "default"],
        ["dark", "default"],
        ["light", "empty"],
        ["dark", "empty"],
      ].map(([theme, state]) => ({
        theme,
        density: "contractor",
        state,
        gates: passed,
      }))
    );
    expect(
      readJson(join(dir, "attempt-1-code/attempt.json")).renders
    ).toHaveLength(4);
  }, 120_000);

  it("ends the rep as error:render when the render pass can't run", async () => {
    const { model, requests } = stubModel(
      message(JSON.stringify(smokeSpec)),
      message(smokeTsx)
    );
    const broken: RenderPass = async () => {
      throw new Error("The render pass wrote no results.");
    };

    const trace = await generate(brief, {
      workDir: workDir(),
      model,
      render: broken,
    });

    expect(trace.outcome).toBe("error");
    expect(trace.endReason).toBe("error:render");
    expect(requests).toHaveLength(2);
    expect(trace.attempts[1]!.gates).toMatchObject({
      "gate 2": "pass",
      "gate 4": "not-run",
      "gate 7 render": "not-run",
    });
  }, 120_000);

  it("records the render gates as not-run when the generated file doesn't build", async () => {
    const broken = smokeTsx.replace(
      'from "../../index.ts"',
      'from "../../no-such-module.ts"'
    );
    const { model, requests } = stubModel(
      message(JSON.stringify(smokeSpec)),
      ...[1, 2, 3].map(() => message(broken))
    );

    const trace = await generate(brief, { workDir: workDir(), model, render });

    const code = trace.attempts[1]!;
    // Three code attempts, the step's limit, and none of them builds.
    expect(requests).toHaveLength(4);
    expect(trace.outcome).toBe("fail");
    expect(trace.endReason).toBe("code-attempts-exhausted");
    expect(trace.screen).toBe("attempt-3-code/Smoke.tsx");
    expect(code.gates).toMatchObject({
      "gate 3": "fail",
      "gate 4": "not-run",
      "gate 7 render": "not-run",
    });
    expect(code.renders).toEqual([]);
    expect(code.failures).toContainEqual(
      expect.stringMatching(/^gate 3 · build · \(build\) · /)
    );
  }, 120_000);

  it("writes the attempt folders, with both prompt hashes recorded", async () => {
    const { model } = stubModel(
      message(JSON.stringify(smokeSpec)),
      message(smokeTsx)
    );
    const dir = workDir();

    const trace = await generate(brief, { workDir: dir, model, render });

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
    expect(rep.endReason).toBe("passed");
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
  }, 120_000);

  it("asks each step with its own config and the cached system prefix", async () => {
    const { model, requests } = stubModel(
      message(JSON.stringify(smokeSpec)),
      message(smokeTsx)
    );

    await generate(brief, { workDir: workDir(), model, render });

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
  }, 120_000);

  it("ends after three spec attempts that fail gate 1, without a code attempt", async () => {
    const broken = {
      ...smokeSpec,
      nodes: smokeSpec.nodes.map((node) =>
        node.id === "welcome" ? { ...node, component: "Paragraph" } : node
      ),
    };
    const { model, requests } = stubModel(
      ...[1, 2, 3].map(() => message(JSON.stringify(broken)))
    );
    const dir = workDir();

    const trace = await generate(brief, { workDir: dir, model, render });

    expect(trace.outcome).toBe("fail");
    expect(trace.endReason).toBe("spec-attempts-exhausted");
    expect(requests).toHaveLength(3);
    expect(trace.attempts.map(({ step, attempt }) => [step, attempt])).toEqual([
      ["spec", 1],
      ["spec", 2],
      ["spec", 3],
    ]);
    // The last attempt has no attempt after it, so no repair turn.
    expect(existsSync(join(dir, "attempt-2-spec/repair-turn.txt"))).toBe(true);
    expect(existsSync(join(dir, "attempt-3-spec/repair-turn.txt"))).toBe(false);
    expect(trace.attempts[0]!.failures).toEqual([
      'gate 1 · registered-component · welcome · "Paragraph" isn\'t a registered component.',
    ]);
    expect(
      readFileSync(join(dir, "attempt-1-spec/failures.txt"), "utf8")
    ).toContain("registered-component · welcome");
    expect(existsSync(join(dir, "attempt-1-code"))).toBe(false);
  }, 120_000);

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
      message(tsx),
      message(smokeTsx)
    );

    const trace = await generate(brief, { workDir: workDir(), model, render });

    const code = trace.attempts[1]!;
    expect(code.gates).toEqual({
      "gate 2": "fail",
      "gate 3": "fail",
      "gate 7 static": "pass",
      "gate 4": "pass",
      "gate 7 render": "pass",
    });
    expect(code.failures).toContainEqual(
      expect.stringMatching(/^gate 2 · no-restricted-syntax · L6:7 · /)
    );
    expect(code.failures).toContainEqual(
      expect.stringMatching(
        /^gate 3 · TS2322 · L7:15 · Type 'number' is not assignable to type 'string'/
      )
    );
  }, 120_000);

  it.each([
    ["refusal", "error:refusal"],
    ["max_tokens", "error:max_tokens"],
  ] as const)(
    "ends the rep as an error on a %s stop, without gating it",
    async (stop, endReason) => {
      const { model, requests } = stubModel(message("", stop));

      const trace = await generate(brief, {
        workDir: workDir(),
        model,
        render,
      });

      expect(trace.outcome).toBe("error");
      expect(trace.endReason).toBe(endReason);
      expect(requests).toHaveLength(1);
      expect(trace.attempts[0]!.gates).toEqual({ "gate 1": "not-run" });
    },
    120_000
  );
});

describe("the repair loop", () => {
  const paragraph = {
    ...smokeSpec,
    nodes: smokeSpec.nodes.map((node) =>
      node.id === "welcome" ? { ...node, component: "Paragraph" } : node
    ),
  };

  it("repairs a UI spec that fails gate 1 with one repair turn, then passes", async () => {
    const { model, requests } = stubModel(
      message(JSON.stringify(paragraph)),
      message(JSON.stringify(smokeSpec)),
      message(smokeTsx)
    );
    const dir = workDir();

    const trace = await generate(brief, { workDir: dir, model, render });

    expect(trace.outcome).toBe("pass");
    expect(trace.endReason).toBe("passed");
    expect(
      trace.attempts.map(({ step, attempt, gates }) => [step, attempt, gates])
    ).toEqual([
      ["spec", 1, { "gate 1": "fail" }],
      ["spec", 2, { "gate 1": "pass" }],
      ["code", 1, expect.objectContaining({ "gate 2": "pass" })],
    ]);
    const turn = `The UI spec you sent fails these gates. Each line is gate · rule id · location · message.

gate 1
gate 1 · registered-component · welcome · "Paragraph" isn't a registered component.

Fix every failure above and send the whole UI spec again.`;
    // Append-only: the second request is the first one, then the reply it
    // got, then the repair turn.
    const [first, second] = requests;
    expect(second!.system).toEqual(first!.system);
    expect(second!.messages).toEqual([
      ...first!.messages,
      {
        role: "assistant",
        content: [
          { type: "text", text: JSON.stringify(paragraph), citations: null },
        ],
      },
      { role: "user", content: turn },
    ]);
    expect(
      readFileSync(join(dir, "attempt-1-spec/repair-turn.txt"), "utf8")
    ).toBe(turn + "\n");
    expect(readJson(join(dir, "attempt-2-spec/ui-spec.json"))).toEqual(
      smokeSpec
    );
    expect(trace.uiSpec).toEqual(smokeSpec);
  }, 120_000);

  it("repairs a TSX file with one repair turn, deduplicated, collapsed across theme × state and capped per gate, then passes", async () => {
    const withState = {
      ...smokeSpec,
      states: [{ name: "empty", fixture: "payment-status/empty" }],
    };
    // An unnamed button, which axe fails in every theme × screen state, and
    // 25 intrinsic elements, which gate 2 fails one line each.
    const failing = `import { Screen, Text } from "../../index.ts";

export function Smoke() {
  return (
    <Screen audience="contractor">
      <Text text="Welcome back. Your invoices and payments will show up here." />
      <button type="button"></button>
${Array.from({ length: 24 }, () => "      <span />").join("\n")}
    </Screen>
  );
}
`;
    const { model, requests } = stubModel(
      message(JSON.stringify(withState)),
      message(failing),
      message(smokeTsx)
    );
    const dir = workDir();

    const trace = await generate(brief, { workDir: dir, model, render });

    expect(trace.endReason).toBe("passed");
    expect(
      trace.attempts.map(({ step, attempt, gates }) => [
        step,
        attempt,
        gates["gate 2"],
        gates["gate 4"],
      ])
    ).toEqual([
      ["spec", 1, undefined, undefined],
      ["code", 1, "fail", "fail"],
      ["code", 2, "pass", "pass"],
    ]);
    const [, first, second] = requests;
    const turn = readFileSync(
      join(dir, "attempt-1-code/repair-turn.txt"),
      "utf8"
    ).trimEnd();
    expect(second!.messages).toEqual([
      ...first!.messages,
      {
        role: "assistant",
        content: [{ type: "text", text: failing, citations: null }],
      },
      { role: "user", content: turn },
    ]);

    const lines = turn.split("\n");
    const gate2 = lines.filter((line) =>
      line.startsWith("gate 2 · no-restricted-syntax · ")
    );
    expect(gate2).toHaveLength(20);
    expect(lines).toContain("gate 2 · +5 more");
    // One line for the button, listing the four renders it fails in.
    const gate4 = lines.filter((line) => line.startsWith("gate 4 · "));
    expect(gate4).toEqual([
      expect.stringMatching(
        /^gate 4 · button-name · button\[type="button"\] <button type="button"><\/button> · Buttons must have discernible text \(in .+\)$/
      ),
    ]);
    for (const where of [
      "light · default",
      "dark · default",
      "light · empty",
      "dark · empty",
    ])
      expect(gate4[0]).toContain(where);
    // The help lines, once per rule id.
    expect(turn).toMatch(/^no-restricted-syntax: \S.*$/m);
    expect(turn).toMatch(/^button-name: \S.*$/m);
    expect(
      lines.filter((line) => line.startsWith("button-name: "))
    ).toHaveLength(1);
    expect(turn).toMatch(
      /Fix every failure above and send the whole TSX file again, in one ```tsx block\.$/
    );
    // The attempt logs the lines as the turn sent them.
    expect(trace.attempts[1]!.failures).toEqual(
      lines.filter((line) => /^gate \d · /.test(line))
    );
  }, 240_000);

  it.each([
    ["refusal", "error:refusal"],
    ["max_tokens", "error:max_tokens"],
  ] as const)(
    "ends the rep as an error on a %s stop in a repair attempt, with no further repair turn",
    async (stop, endReason) => {
      // A truncated reply that would fail every gate if it were gated.
      const truncated = smokeTsx.slice(0, 60);
      const { model, requests } = stubModel(
        message(JSON.stringify(paragraph)),
        message(truncated, stop)
      );
      const dir = workDir();

      const trace = await generate(brief, { workDir: dir, model, render });

      expect(trace.outcome).toBe("error");
      expect(trace.endReason).toBe(endReason);
      expect(requests).toHaveLength(2);
      expect(
        trace.attempts.map(({ attempt, gates, failures, stopReason }) => [
          attempt,
          gates,
          failures,
          stopReason,
        ])
      ).toEqual([
        [
          1,
          { "gate 1": "fail" },
          [
            'gate 1 · registered-component · welcome · "Paragraph" isn\'t a registered component.',
          ],
          "end_turn",
        ],
        [2, { "gate 1": "not-run" }, [], stop],
      ]);
      expect(existsSync(join(dir, "attempt-2-spec/repair-turn.txt"))).toBe(
        false
      );
      expect(existsSync(join(dir, "attempt-1-code"))).toBe(false);
    },
    120_000
  );

  it.each([
    ["refusal", "error:refusal"],
    ["max_tokens", "error:max_tokens"],
  ] as const)(
    "ends the rep as an error on a %s stop in the code step, without gating it",
    async (stop, endReason) => {
      const { model, requests } = stubModel(
        message(JSON.stringify(smokeSpec)),
        message(smokeTsx.slice(0, 60), stop)
      );
      const dir = workDir();

      const trace = await generate(brief, { workDir: dir, model, render });

      expect(trace.outcome).toBe("error");
      expect(trace.endReason).toBe(endReason);
      expect(requests).toHaveLength(2);
      expect(trace.attempts[1]!.gates).toEqual({
        "gate 2": "not-run",
        "gate 3": "not-run",
        "gate 7 static": "not-run",
        "gate 4": "not-run",
        "gate 7 render": "not-run",
      });
      expect(existsSync(join(dir, "attempt-1-code/repair-turn.txt"))).toBe(
        false
      );
    },
    120_000
  );

  it("computes each attempt's cost from its logged usage, and keeps every attempt's gate results", async () => {
    const priced = (text: string) => ({
      ...message(text),
      usage: {
        ...message(text).usage,
        input_tokens: 2_000,
        output_tokens: 1_000,
        cache_read_input_tokens: 10_000,
        cache_creation_input_tokens: 4_000,
      },
    });
    const { model } = stubModel(
      priced(JSON.stringify(paragraph)),
      priced(JSON.stringify(smokeSpec)),
      priced(smokeTsx)
    );
    const dir = workDir();

    const trace = await generate(brief, { workDir: dir, model, render });

    // At $4, $20, $0.20 and $5 per million input, output, cache-read and
    // cache-write tokens: $0.008 + $0.02 + $0.002 + $0.02.
    for (const attempt of trace.attempts) {
      expect(attempt.usage).toEqual({
        input: 2_000,
        output: 1_000,
        cacheRead: 10_000,
        cacheWrite: 4_000,
      });
      expect(attempt.cost).toBeCloseTo(0.05, 10);
    }
    expect(trace.attempts.map(({ gates }) => gates)).toEqual([
      { "gate 1": "fail" },
      { "gate 1": "pass" },
      {
        "gate 2": "pass",
        "gate 3": "pass",
        "gate 7 static": "pass",
        "gate 4": "pass",
        "gate 7 render": "pass",
      },
    ]);
    expect(readJson(join(dir, "rep.json")).attempts).toEqual(
      JSON.parse(JSON.stringify(trace.attempts))
    );
  }, 120_000);
});
