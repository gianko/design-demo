// @vitest-environment node
// `pnpm generate <screen brief>` with a stubbed model: it prints each step's
// gate results and the pass criteria, and exits 0 only on `passed` with the
// pass criteria met. The render pass is stubbed, since the real one needs
// Docker (ADR 0009). Gate 5's judge answers with a recorded reply, never the
// live model, and passes every criterion unless a test says otherwise.

import { randomUUID } from "node:crypto";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type Anthropic from "@anthropic-ai/sdk";
import { afterEach, describe, expect, it } from "vitest";
import { main } from "./cli.ts";
import type { Model } from "./model.ts";
import type { RenderPass } from "./render-gates.ts";
import { repo } from "../repo.ts";

// A judge reply as the Messages API returns one; its verdicts fail only
// repetition.
const recorded: Anthropic.Message = JSON.parse(
  readFileSync(join(import.meta.dirname, "fixtures/judge-reply.json"), "utf8")
);

// The recorded reply with every verdict passing.
const allPass: Anthropic.Message = {
  ...recorded,
  content: [
    {
      type: "text",
      citations: null,
      text: (recorded.content[1] as Anthropic.TextBlock).text.replace(
        '"pass":false',
        '"pass":true'
      ),
    },
  ],
};

// The recorded reply with the copy verdict's reason quoting nothing in the
// design brief, so copy is undecided; every verdict counted passes.
const misquoted: Anthropic.Message = {
  ...allPass,
  content: [
    {
      type: "text",
      citations: null,
      text: (allPass.content[0] as Anthropic.TextBlock).text.replace(
        'as \\"Copy is second person, active and specific\\" asks',
        "as the brief asks"
      ),
    },
  ],
};

// Every render passes, in light and dark × the default state at the
// audience's density.
const render: RenderPass = async ({ audience }) => {
  const gates = { "gate 4": "pass", "gate 7 render": "pass" } as const;
  return {
    built: true,
    gates,
    renders: (["light", "dark"] as const).map((theme) => ({
      theme,
      density: audience,
      state: "default",
      gates,
    })),
    failures: [],
  };
};

// As `render`, with a rest shot per render written where the real pass
// writes them, each PNG's bytes naming its theme × state.
const shooting: RenderPass = async (input) => {
  const rendered = await render(input);
  const dir = join(input.dir, "render/shots");
  mkdirSync(dir, { recursive: true });
  return {
    ...rendered,
    shots: rendered.renders.map(({ theme, state }) => {
      const file = join(dir, `${theme}--${state}.png`);
      writeFileSync(file, `${theme} ${state} png`);
      return { theme, state, file };
    }),
  };
};

// A judge that answers every request with `reply`, keeping the requests.
function judging(
  reply: () => Anthropic.Message | Promise<Anthropic.Message> = () => recorded
) {
  const requests: Anthropic.MessageCreateParamsNonStreaming[] = [];
  const judge: Model = async (params) => {
    requests.push(params);
    return { message: await reply(), requestId: "req_recorded" };
  };
  return { judge, requests };
}

const smokeBrief = readFileSync(
  join(import.meta.dirname, "fixtures/smoke.md"),
  "utf8"
);

const uiSpec = JSON.stringify({
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
      props: [{ name: "text", value: '"Welcome back."' }],
      when: [],
      action: null,
    },
  ],
  states: [],
  actions: [],
});

const passingTsx = `import { Screen, Text } from "../../index.ts";

export function NAME() {
  return (
    <Screen audience="contractor">
      <Text text="Welcome back." />
    </Screen>
  );
}
`;

function reply(text: string): Anthropic.Message {
  return {
    id: "msg_stub",
    type: "message",
    role: "assistant",
    model: "claude-opus-5-5",
    content: [{ type: "text", text, citations: null }],
    stop_reason: "end_turn",
    stop_sequence: null,
    // $0.004 + $0.01 + $0.004 + $0.005 at Opus 5.5's prices.
    usage: {
      input_tokens: 1000,
      output_tokens: 500,
      cache_read_input_tokens: 20_000,
      cache_creation_input_tokens: 1000,
    },
  } as Anthropic.Message;
}

function stub(...texts: string[]): Model {
  return async () => ({ message: reply(texts.shift()!), requestId: null });
}

// `model`, counting its calls.
function counting(model: Model) {
  let n = 0;
  return {
    model: ((params) => {
      n++;
      return model(params);
    }) satisfies Model,
    calls: () => n,
  };
}

const cleanup: string[] = [];
afterEach(() => {
  for (const path of cleanup.splice(0))
    rmSync(path, { recursive: true, force: true });
});

// A screen brief under a unique slug, so each rep gets its own rep dir.
function brief(text: string) {
  const dir = join(repo, ".generated", `vitest-briefs-${randomUUID()}`);
  mkdirSync(dir, { recursive: true });
  cleanup.push(dir);
  const slug = `cli-${randomUUID().slice(0, 8)}`;
  const path = join(dir, `${slug}.md`);
  writeFileSync(path, text);
  return { path };
}

async function run(
  briefPath: string,
  model: Model,
  stand: { render?: RenderPass; judge?: Model } = {}
) {
  const lines: string[] = [];
  let repDir = "";
  const code = await main([briefPath], {
    model,
    render: stand.render ?? shooting,
    judge: stand.judge ?? judging(() => allPass).judge,
    log: (line) => lines.push(line),
    onRepDir: (dir) => {
      repDir = dir;
      cleanup.push(dir);
    },
  });
  return { code, output: lines.join("\n"), repDir };
}

function tsxFor(path: string) {
  const slug = path.split("/").pop()!.replace(/\.md$/, "");
  const name = slug
    .split("-")
    .map((part) => part[0]!.toUpperCase() + part.slice(1))
    .join("");
  return passingTsx.replace("NAME", name);
}

describe("pnpm generate", () => {
  it("exits 0 on passed with the pass criteria met, printing each step's gates", async () => {
    const { path } = brief(smokeBrief);

    const { code, output } = await run(path, stub(uiSpec, tsxFor(path)));

    expect(output).toMatch(/spec · attempt 1 · gate 1 pass/);
    expect(output).toMatch(
      /code · attempt 1 · gate 2 pass · gate 3 pass · gate 7 static pass · gate 4 pass · gate 7 render pass/
    );
    // The render gates per theme × screen state, at the audience's density.
    expect(output).toContain(
      "  light · default · contractor · gate 4 pass · gate 7 render pass"
    );
    expect(output).toContain(
      "  dark · default · contractor · gate 4 pass · gate 7 render pass"
    );
    expect(output).toMatch(/pass criteria: met/);
    expect(output).toMatch(/^outcome: pass · end reason passed$/m);
    expect(output).toMatch(/\.generated\/\d{8}-\d{6}-cli-/);
    expect(code).toBe(0);
  }, 120_000);

  it("exits non-zero on passed when the pass criteria aren't met", async () => {
    const { path } = brief(
      smokeBrief.replace(
        "components: [Screen, Text]\n  states: []",
        "components: [Screen, Text, Card]\n  states: [empty]"
      )
    );

    const { code, output } = await run(path, stub(uiSpec, tsxFor(path)));

    expect(output).toMatch(/^outcome: pass · end reason passed$/m);
    expect(output).toMatch(
      /pass criteria: not met · missing component Card, state empty/
    );
    expect(code).toBe(1);
  }, 120_000);

  it("exits non-zero when a gate fails, printing the failure", async () => {
    const { path } = brief(smokeBrief);
    const failing = tsxFor(path)
      .replace("<Text", "<div><Text")
      .replace("/>", "/></div>");

    const { code, output } = await run(
      path,
      stub(uiSpec, failing, failing, failing)
    );

    expect(output).toMatch(/gate 2 fail/);
    expect(output).toMatch(/gate 2 · no-restricted-syntax · L6:7/);
    expect(output).toMatch(
      /^outcome: fail · end reason code-attempts-exhausted$/m
    );
    expect(code).toBe(1);
  }, 120_000);

  it("prints a table of every attempt, with its gates, usage, cost and time", async () => {
    const { path } = brief(smokeBrief);
    const failing = tsxFor(path)
      .replace("<Text", "<div><Text")
      .replace("/>", "/></div>");

    const { code, output } = await run(
      path,
      stub(uiSpec, failing, tsxFor(path))
    );

    // A row's cells, then its model and gates wall times.
    const row = (cells: string[]) => {
      const escaped = cells.map((cell) => cell.replace(/[$.]/g, "\\$&"));
      const time = String.raw`\d+\.\ds`;
      return new RegExp(
        `^${[...escaped, time, time].join(String.raw`\s+`)}$`,
        "m"
      );
    };
    const usage = ["end_turn", "1000", "500", "20000", "1000", "$0.0230"];
    expect(output).toMatch(
      /^step\s+attempt\s+gate 1\s+gate 2\s+gate 3\s+gate 7 static\s+gate 4\s+gate 7 render\s+stop\s+input\s+output\s+cache read\s+cache write\s+cost\s+model\s+gates$/m
    );
    expect(output).toMatch(
      row(["spec", "1", "pass", "–", "–", "–", "–", "–", ...usage])
    );
    expect(output).toMatch(
      row(["code", "1", "–", "fail", "pass", "pass", "pass", "pass", ...usage])
    );
    expect(output).toMatch(
      row(["code", "2", "–", "pass", "pass", "pass", "pass", "pass", ...usage])
    );
    expect(output).toMatch(/^cost: \$0\.0690 over 3 attempts$/m);
    expect(output).toMatch(/^outcome: pass · end reason passed$/m);
    expect(code).toBe(0);
  }, 120_000);

  it("judges the final screen's light shot of each state as gate 5, printing each state's verdicts, each failing one and the score", async () => {
    const { path } = brief(smokeBrief);
    const { judge, requests } = judging();

    const { output, repDir } = await run(path, stub(uiSpec, tsxFor(path)), {
      judge,
    });

    // One request, for the one state's light shot.
    expect(requests).toHaveLength(1);
    const [image, text] = requests[0]!.messages[0]!
      .content as Anthropic.ContentBlockParam[];
    expect(image).toMatchObject({
      type: "image",
      source: { data: Buffer.from("light default png").toString("base64") },
    });
    expect((text as Anthropic.TextBlockParam).text).toContain(smokeBrief);
    // The judge never sees the code or the UI spec.
    const sent = JSON.stringify(requests);
    expect(sent).not.toContain("../../index.ts");
    expect(sent).not.toContain("<Screen");
    expect(sent).not.toContain('\\"component\\"');

    expect(output).toContain(
      "gate 5 · default · hierarchy pass · density pass · accent pass · elevation pass · copy pass · repetition fail · 5/6"
    );
    expect(output).toContain(
      '  gate 5 · default · repetition · The card says "Overdue" in its title, its status tag and its text, where the tag alone would do, since "Every status tag carries its word."'
    );
    expect(output).toMatch(/^gate 5 score: 5\/6 over 1 state · \$0\.0255$/m);
    // Its verdicts are kept beside the rep's attempts.
    expect(
      JSON.parse(readFileSync(join(repDir, "conformance.json"), "utf8"))
    ).toMatchObject({ ran: true, score: { passed: 5, of: 6 } });
  }, 120_000);

  it("fails a rep whose final screen fails a gate 5 criterion, with gate 5 as the end reason and no repair turn", async () => {
    const { path } = brief(smokeBrief);
    const { model, calls } = counting(stub(uiSpec, tsxFor(path)));

    const { code, output, repDir } = await run(path, model, {
      render: shooting,
      judge: judging().judge,
    });

    // The spec and code attempts, and no repair turn after the judge.
    expect(calls()).toBe(2);
    expect(output).not.toMatch(/code · attempt 2/);
    expect(output).toMatch(/^outcome: fail · end reason gate5-failed$/m);
    expect(code).toBe(1);
    // pnpm keep reads the rep dir's rep.json, so it won't keep this rep.
    expect(
      JSON.parse(readFileSync(join(repDir, "rep.json"), "utf8"))
    ).toMatchObject({ outcome: "fail", endReason: "gate5-failed" });
  }, 120_000);

  it("passes a rep whose only gap in gate 5 is an undecided criterion", async () => {
    const { path } = brief(smokeBrief);

    const { code, output } = await run(path, stub(uiSpec, tsxFor(path)), {
      judge: judging(() => misquoted).judge,
    });

    expect(output).toContain(
      'gate 5 · default · copy · unquoted · "Your invoice is 12 days overdue" speaks to the contractor and names the delay, as the brief asks.'
    );
    expect(output).toMatch(/^gate 5 score: 5\/5 over 1 state/m);
    expect(output).toMatch(/^outcome: pass · end reason passed$/m);
    expect(code).toBe(0);
  }, 120_000);

  it("keeps a failed rep's own end reason, whatever gate 5 says, and when its judge fails", async () => {
    const { path } = brief(smokeBrief);
    const failing = tsxFor(path)
      .replace("<Text", "<div><Text")
      .replace("/>", "/></div>");

    const judged = await Promise.all(
      [
        () => allPass,
        () => recorded,
        () => Promise.reject(new Error("overloaded")),
      ].map((reply) =>
        run(path, stub(uiSpec, failing, failing, failing), {
          judge: judging(reply).judge,
        })
      )
    );

    expect(judged[0]!.output).toMatch(/^gate 5 score: 6\/6 over 1 state/m);
    expect(judged[1]!.output).toMatch(/^gate 5 score: 5\/6 over 1 state/m);
    expect(judged[2]!.output).toMatch(
      /^gate 5 not run · 1 of 1 state unjudged$/m
    );
    for (const { output, code } of judged) {
      expect(output).toMatch(
        /^outcome: fail · end reason code-attempts-exhausted$/m
      );
      expect(code).toBe(1);
    }
  }, 120_000);

  it("ends the rep in error when the judge's call fails or its reply is malformed, showing gate 5 as not run", async () => {
    const { path } = brief(smokeBrief);
    const malformed = {
      ...recorded,
      content: [
        { type: "text" as const, citations: null, text: "Looks fine." },
      ],
    };

    const errored = await run(path, stub(uiSpec, tsxFor(path)), {
      judge: judging(() => Promise.reject(new Error("overloaded"))).judge,
    });
    const garbled = await run(path, stub(uiSpec, tsxFor(path)), {
      judge: judging(() => malformed).judge,
    });

    expect(errored.output).toContain("gate 5 · default · not run · api");
    expect(errored.output).toMatch(/^gate 5 not run · 1 of 1 state unjudged$/m);
    expect(garbled.output).toContain(
      "gate 5 · default · not run · malformed: not JSON"
    );
    for (const { output, code } of [errored, garbled]) {
      expect(output).not.toMatch(/gate 5 score/);
      expect(output).toMatch(/^outcome: error · end reason error:gate5$/m);
      expect(code).toBe(1);
    }
  }, 120_000);

  it("ends a rep that passed every other gate in error when its screen has no shots to judge", async () => {
    const { path } = brief(smokeBrief);
    const { judge, requests } = judging();

    const { code, output } = await run(path, stub(uiSpec, tsxFor(path)), {
      render,
      judge,
    });

    expect(requests).toEqual([]);
    expect(output).toMatch(/^gate 5 not run · no screenshots$/m);
    expect(output).toMatch(/^outcome: error · end reason error:gate5$/m);
    expect(code).toBe(1);
  }, 120_000);

  it("doesn't judge a screen that never rendered, or a rep that ended in error, and leaves how each ended", async () => {
    const { path } = brief(smokeBrief);
    const { judge, requests } = judging();
    const down: Model = async () => {
      throw new Error("overloaded");
    };

    const unrendered = await run(path, stub("not a UI spec", "x", "y"), {
      render: shooting,
      judge,
    });
    const errored = await run(path, down, { render: shooting, judge });

    expect(requests).toEqual([]);
    expect(unrendered.output).toMatch(/^gate 5 not run · no screenshots$/m);
    expect(unrendered.output).toMatch(
      /^outcome: fail · end reason spec-attempts-exhausted$/m
    );
    expect(errored.output).toMatch(
      /^gate 5 not run · the rep ended in error$/m
    );
    expect(errored.output).toMatch(/^outcome: error · end reason error:api$/m);
  }, 120_000);
});
