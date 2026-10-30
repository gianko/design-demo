// @vitest-environment node
// Brief conformance (gate 5, ADR 0014): the judge's request for each screen
// state, and its verdicts parsed from a recorded reply. No test calls the
// live model.

import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import type Anthropic from "@anthropic-ai/sdk";
import { describe, expect, it } from "vitest";
import {
  findings,
  judgeScreen,
  judgeTrace,
  rubric,
  rubricCriteria,
  screenPasses,
} from "./conformance.ts";
import type { RepTrace } from "./generate.ts";
import type { Model } from "./model.ts";
import { readScreenBrief } from "./screen-brief.ts";
import { repo } from "../repo.ts";

const designBrief = readFileSync(join(repo, "docs/design-brief.md"), "utf8");
const brief = readScreenBrief(join(repo, "evals/briefs/payment-status.md"));

// Two screenshots' bytes; the judge only passes them on.
const shots = [
  { state: "default", png: Buffer.from("default-png") },
  { state: "reminder-sent", png: Buffer.from("reminder-sent-png") },
];

// A judge reply as the Messages API returns one: an omitted thinking block,
// then the structured output.
const recorded: Anthropic.Message = JSON.parse(
  readFileSync(join(import.meta.dirname, "fixtures/judge-reply.json"), "utf8")
);

// Answers every request with `reply`, keeping the requests it was sent.
function recording(
  reply: (
    params: Anthropic.MessageCreateParamsNonStreaming
  ) => Anthropic.Message = () => recorded
) {
  const requests: Anthropic.MessageCreateParamsNonStreaming[] = [];
  const model: Model = async (params) => {
    requests.push(params);
    return { message: reply(params), requestId: "req_recorded" };
  };
  return { model, requests };
}

describe("judgeScreen", () => {
  it("sends one Opus 5.5 request per screen state: its screenshot, the screen brief and the state, after the rubric and the design brief", async () => {
    const { model, requests } = recording();

    await judgeScreen({ brief, screenshots: shots, designBrief }, model);

    expect(requests).toHaveLength(2);
    for (const [i, request] of requests.entries()) {
      expect(request.model).toBe("claude-opus-5-5");
      // The rubric and the design brief are the cached prefix every request
      // shares.
      const system = request.system as Anthropic.TextBlockParam[];
      const prefix = system.map((block) => block.text).join("\n");
      for (const criterion of rubricCriteria) {
        for (const words of rubric[criterion]) {
          expect(prefix).toContain(words);
        }
      }
      expect(prefix).toContain("Errors say what happened and what to do next.");
      expect(prefix).toContain(
        'Say a thing once: a card doesn\'t repeat "Overdue" in its title, its tag and its text.'
      );
      expect(prefix).toContain(designBrief);
      expect(system.at(-1)!.cache_control).toEqual({ type: "ephemeral" });

      const [turn] = request.messages;
      expect(turn!.role).toBe("user");
      const [image, text] = turn!.content as Anthropic.ContentBlockParam[];
      expect(image).toEqual({
        type: "image",
        source: {
          type: "base64",
          media_type: "image/png",
          data: shots[i]!.png.toString("base64"),
        },
      });
      expect(text).toMatchObject({ type: "text" });
      const words = (text as Anthropic.TextBlockParam).text;
      expect(words).toContain(brief.text);
      expect(words).toContain(`"${shots[i]!.state}"`);
      expect(words).toContain("contractor");
    }
  });

  it("parses each state's six verdicts from the recorded reply and scores the screen", async () => {
    const { model } = recording();

    const result = await judgeScreen(
      { brief, screenshots: shots, designBrief },
      model
    );

    expect(result.ran).toBe(true);
    expect(result.states.map(({ state }) => state)).toEqual([
      "default",
      "reminder-sent",
    ]);
    const [first] = result.states;
    expect(first).toMatchObject({ judged: true, passed: 5 });
    if (!first!.judged) throw new Error("unjudged");
    expect(
      first!.verdicts.map(({ criterion, pass }) => [criterion, pass])
    ).toEqual([
      ["hierarchy", true],
      ["density", true],
      ["accent", true],
      ["elevation", true],
      ["copy", true],
      ["repetition", false],
    ]);
    expect(first!.verdicts.at(-1)!.reason).toBe(
      'The card says "Overdue" in its title, its status tag and its text, where the tag alone would do, since "Every status tag carries its word."'
    );
    // Both states fail repetition, so the screen passes the other five.
    expect(result.score).toEqual({ passed: 5, of: 6 });
    // 1650 input, 900 output and 4300 cache-read tokens at Opus 5.5's
    // prices, twice.
    expect(first!.call).toMatchObject({
      usage: { input: 1650, output: 900, cacheRead: 4300, cacheWrite: 0 },
      requestId: "req_recorded",
      stopReason: "end_turn",
    });
    expect(result.cost).toBeCloseTo(2 * 0.02546, 6);
  });

  it("scores the screen as the criteria every state passes, out of six", async () => {
    const reply = JSON.parse((recorded.content[1] as Anthropic.TextBlock).text);
    // The default state fails repetition, as recorded; the reminder-sent
    // state passes repetition and fails accent.
    const { model } = recording((params) => {
      const [, text] = params.messages[0]!
        .content as Anthropic.TextBlockParam[];
      if (text!.text.includes('"default"')) return recorded;
      return {
        ...recorded,
        content: [
          {
            type: "text",
            citations: null,
            text: JSON.stringify({
              ...reply,
              accent: { ...reply.accent, pass: false },
              repetition: { ...reply.repetition, pass: true },
            }),
          },
        ],
      };
    });

    const result = await judgeScreen(
      { brief, screenshots: shots, designBrief },
      model
    );

    expect(result.score).toEqual({ passed: 4, of: 6 });
    expect(screenPasses(result.states, "hierarchy")).toBe(true);
    expect(screenPasses(result.states, "accent")).toBe(false);
    expect(screenPasses(result.states, "repetition")).toBe(false);
  });

  it("leaves a screen's criterion undecided when no state fails it and some state wasn't judged", async () => {
    const failing: Model = async (params) => {
      const [, text] = params.messages[0]!
        .content as Anthropic.TextBlockParam[];
      if (text!.text.includes('"default"')) throw new Error("overloaded");
      return { message: recorded, requestId: null };
    };

    const result = await judgeScreen(
      { brief, screenshots: shots, designBrief },
      failing
    );

    expect(screenPasses(result.states, "hierarchy")).toBeNull();
    expect(screenPasses(result.states, "repetition")).toBe(false);
    expect(screenPasses([], "hierarchy")).toBeNull();
  });

  it("leaves gate 5 not run when a state's call fails, is refused or runs out of tokens", async () => {
    const failing: Model = async (params) => {
      const [, text] = params.messages[0]!
        .content as Anthropic.TextBlockParam[];
      if (text!.text.includes('"default"')) throw new Error("overloaded");
      return { message: recorded, requestId: null };
    };
    const refused = recording(() => ({ ...recorded, stop_reason: "refusal" }));
    const truncated = recording(() => ({
      ...recorded,
      stop_reason: "max_tokens",
    }));

    const input = { brief, screenshots: shots, designBrief };
    const results = {
      api: await judgeScreen(input, failing),
      refusal: await judgeScreen(input, refused.model),
      max_tokens: await judgeScreen(input, truncated.model),
    };

    for (const [error, result] of Object.entries(results)) {
      expect(result.ran).toBe(false);
      expect(result.score).toBeNull();
      expect(result.states[0]).toMatchObject({
        state: "default",
        judged: false,
        error,
      });
    }
    // The other state still has its verdicts, and its call its cost.
    expect(results.api.states[1]).toMatchObject({ judged: true, passed: 5 });
    expect(results.api.cost).toBeCloseTo(0.02546, 6);
  });

  it("counts a state's other verdicts when one reason quotes nothing in the design brief, keeping that reason", async () => {
    const reply = JSON.parse((recorded.content[1] as Anthropic.TextBlock).text);
    const misquote = {
      reason:
        'The heading reads "You have 3 invoices to chase", which is direct.',
      pass: true,
    };
    const { model } = recording(() => ({
      ...recorded,
      content: [
        {
          type: "text",
          citations: null,
          text: JSON.stringify({ ...reply, copy: misquote }),
        },
      ],
    }));

    const result = await judgeScreen(
      { brief, screenshots: shots.slice(0, 1), designBrief },
      model
    );

    expect(result.ran).toBe(true);
    const [state] = result.states;
    if (!state!.judged) throw new Error("unjudged");
    expect(state!.verdicts.map(({ criterion }) => criterion)).toEqual([
      "hierarchy",
      "density",
      "accent",
      "elevation",
      "repetition",
    ]);
    expect(state!.passed).toBe(4);
    expect(state!.unquoted).toEqual([{ criterion: "copy", ...misquote }]);
    expect(screenPasses(result.states, "copy")).toBeNull();
    // Repetition fails, as recorded; copy is undecided, so the score is out
    // of the five criteria decided.
    expect(result.score).toEqual({ passed: 4, of: 5 });
  });

  it("fails a screen's criterion on any state that fails it, even when another state's verdict on it quoted nothing", async () => {
    const reply = JSON.parse((recorded.content[1] as Anthropic.TextBlock).text);
    // The default state fails repetition, as recorded; the reminder-sent
    // state's repetition reason quotes nothing in the brief.
    const { model } = recording((params) => {
      const [, text] = params.messages[0]!
        .content as Anthropic.TextBlockParam[];
      if (text!.text.includes('"default"')) return recorded;
      return {
        ...recorded,
        content: [
          {
            type: "text",
            citations: null,
            text: JSON.stringify({
              ...reply,
              repetition: { reason: "Each card says it once.", pass: true },
            }),
          },
        ],
      };
    });

    const result = await judgeScreen(
      { brief, screenshots: shots, designBrief },
      model
    );

    expect(screenPasses(result.states, "repetition")).toBe(false);
    expect(result.score).toEqual({ passed: 5, of: 6 });
  });

  it("counts a reason that quotes any of its criterion's rubric words, since they're the design brief's", async () => {
    const reply = JSON.parse((recorded.content[1] as Anthropic.TextBlock).text);
    const input = { brief, screenshots: shots.slice(0, 1), designBrief };

    for (const criterion of rubricCriteria) {
      expect(rubric[criterion].length).toBeGreaterThan(0);
      for (const words of rubric[criterion]) {
        const { model } = recording(() => ({
          ...recorded,
          content: [
            {
              type: "text",
              citations: null,
              text: JSON.stringify({
                ...reply,
                [criterion]: {
                  reason: `The screenshot holds to the brief: “${words}”`,
                  pass: true,
                },
              }),
            },
          ],
        }));

        const [state] = (await judgeScreen(input, model)).states;

        expect(state, `${criterion}: ${words}`).toMatchObject({
          judged: true,
          unquoted: [],
        });
      }
    }
  });

  it("leaves gate 5 not run on verdicts that don't parse", async () => {
    const replying = (text: string) =>
      recording(() => ({
        ...recorded,
        content: [{ type: "text", text, citations: null }],
      })).model;
    const reply = JSON.parse((recorded.content[1] as Anthropic.TextBlock).text);
    const input = { brief, screenshots: shots.slice(0, 1), designBrief };

    const notJson = await judgeScreen(input, replying("Looks good to me."));
    const missing = await judgeScreen(
      input,
      replying(JSON.stringify({ ...reply, copy: undefined }))
    );

    expect(notJson.states[0]).toMatchObject({
      judged: false,
      error: "malformed: not JSON",
    });
    expect(missing.states[0]).toMatchObject({ judged: false });
    expect((missing.states[0] as { error: string }).error).toMatch(
      /^malformed: .*copy/
    );
    for (const result of [notJson, missing]) {
      expect(result.ran).toBe(false);
    }
  });

  it("counts only quotes of the design brief, not of a paraphrase or the screen brief", async () => {
    const replying = (text: string) =>
      recording(() => ({
        ...recorded,
        content: [{ type: "text", text, citations: null }],
      })).model;
    const reply = JSON.parse((recorded.content[1] as Anthropic.TextBlock).text);
    const input = { brief, screenshots: shots.slice(0, 1), designBrief };
    const unquoted = (result: Awaited<ReturnType<typeof judgeScreen>>) => {
      const [state] = result.states;
      if (!state!.judged) throw new Error("unjudged");
      return state!.unquoted!.map(({ criterion }) => criterion);
    };

    const paraphrased = await judgeScreen(
      input,
      replying(
        JSON.stringify({
          ...reply,
          accent: {
            reason:
              'Heather sits only on the button, as "the accent is for actions" says.',
            pass: true,
          },
        })
      )
    );
    // The rubric's wording before #341, which paraphrased the brief.
    const rubricQuoted = await judgeScreen(
      input,
      replying(
        JSON.stringify({
          ...reply,
          accent: {
            reason:
              'Heather fills only Send reminder, so "The accent appears only on the primary action, selection and focus."',
            pass: true,
          },
        })
      )
    );
    const screenBriefQuoted = await judgeScreen(
      input,
      replying(
        JSON.stringify({
          ...reply,
          copy: {
            reason:
              'The button reads Send reminder, "a Send reminder action that asks the client to pay."',
            pass: true,
          },
        })
      )
    );

    expect(unquoted(paraphrased)).toEqual(["accent"]);
    expect(unquoted(rubricQuoted)).toEqual(["accent"]);
    expect(unquoted(screenBriefQuoted)).toEqual(["copy"]);
  });

  it("doesn't run with no screenshots", async () => {
    const { model, requests } = recording();

    const result = await judgeScreen(
      { brief, screenshots: [], designBrief },
      model
    );

    expect(requests).toEqual([]);
    expect(result).toMatchObject({
      ran: false,
      states: [],
      score: null,
      cost: 0,
    });
  });
});

// Gate 5 on a rep's final screen, as `pnpm generate` and eval runs run it.
describe("judgeTrace", () => {
  // A rep's trace whose final attempt took these rest shots, each written
  // where the render pass writes them.
  function traced(shots: { theme: "light" | "dark"; state: string }[]) {
    const workDir = mkdtempSync(join(tmpdir(), "judge-trace-"));
    mkdirSync(join(workDir, "shots"));
    for (const { theme, state } of shots) {
      writeFileSync(join(workDir, `shots/${theme}--${state}.png`), state);
    }
    return {
      slug: brief.slug,
      workDir,
      outcome: "pass",
      endReason: "passed",
      attempts: [],
      shots: shots.map(({ theme, state }) => ({
        theme,
        state,
        file: `shots/${theme}--${state}.png`,
      })),
    } as unknown as RepTrace;
  }

  it("judges each state's light shot and says nothing about why it didn't run", async () => {
    const { model, requests } = recording();

    const result = await judgeTrace(
      traced([
        { theme: "light", state: "default" },
        { theme: "dark", state: "default" },
        { theme: "light", state: "reminder-sent" },
      ]),
      brief,
      model
    );

    expect(requests).toHaveLength(2);
    expect(result).toMatchObject({
      ran: true,
      notRun: null,
      score: { passed: 5, of: 6 },
    });
    expect(result.promptHash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("is not run with no screenshots, or with screenshots it can't read", async () => {
    const { model, requests } = recording();
    const unreadable = traced([{ theme: "light", state: "default" }]);
    unreadable.shots = [
      { theme: "light", state: "default", file: "shots/missing.png" },
    ];

    const none = await judgeTrace(traced([]), brief, model);
    const missing = await judgeTrace(unreadable, brief, model);

    expect(requests).toEqual([]);
    expect(none).toMatchObject({
      ran: false,
      notRun: "no screenshots",
      states: [],
      score: null,
      cost: 0,
    });
    expect(missing.ran).toBe(false);
    expect(missing.notRun).toMatch(/^no screenshots: ENOENT/);
  });

  it("says how many states went unjudged", async () => {
    const failing: Model = async (params) => {
      const [, text] = params.messages[0]!
        .content as Anthropic.TextBlockParam[];
      if (text!.text.includes('"default"')) throw new Error("overloaded");
      return { message: recorded, requestId: null };
    };

    const result = await judgeTrace(
      traced([
        { theme: "light", state: "default" },
        { theme: "light", state: "reminder-sent" },
      ]),
      brief,
      failing
    );

    expect(result).toMatchObject({
      ran: false,
      notRun: "1 of 2 states unjudged",
      score: null,
    });
    expect(result.cost).toBeCloseTo(0.02546, 6);
  });
});

describe("findings", () => {
  it("reads a state's failing verdicts, or why it wasn't judged, as a taste rule's finding does", async () => {
    const failing: Model = async (params) => {
      const [, text] = params.messages[0]!
        .content as Anthropic.TextBlockParam[];
      if (text!.text.includes('"default"')) throw new Error("overloaded");
      return { message: recorded, requestId: null };
    };

    const { states } = await judgeScreen(
      { brief, screenshots: shots, designBrief },
      failing
    );

    expect(states.map(findings)).toEqual([
      ["gate 5 · default · not run · api"],
      [
        'gate 5 · reminder-sent · repetition · The card says "Overdue" in its title, its status tag and its text, where the tag alone would do, since "Every status tag carries its word."',
      ],
    ]);
  });

  it("reads a verdict that wasn't counted with its reason, so a run shows why its quote missed", async () => {
    const reply = JSON.parse((recorded.content[1] as Anthropic.TextBlock).text);
    const { model } = recording(() => ({
      ...recorded,
      content: [
        {
          type: "text",
          citations: null,
          text: JSON.stringify({
            ...reply,
            copy: { reason: "The copy is direct and specific.", pass: true },
          }),
        },
      ],
    }));

    const { states } = await judgeScreen(
      { brief, screenshots: shots.slice(0, 1), designBrief },
      model
    );

    expect(findings(states[0]!)).toEqual([
      'gate 5 · default · repetition · The card says "Overdue" in its title, its status tag and its text, where the tag alone would do, since "Every status tag carries its word."',
      "gate 5 · default · copy · unquoted · The copy is direct and specific.",
    ]);
  });
});

// Gate 5 runs in `pnpm generate` and eval runs, never in `pnpm gate`: CI has
// no API key (ADR 0009), and library stories aren't screens.
describe("pnpm gate", () => {
  it("never reaches the judge", () => {
    const judge = join(import.meta.dirname, "conformance.ts");
    const reached = new Set<string>();
    const visit = (file: string) => {
      if (reached.has(file)) return;
      reached.add(file);
      const source = readFileSync(file, "utf8");
      for (const [, path] of source.matchAll(
        /(?:from|import)\s*\(?\s*"(\.{1,2}\/[^"]+\.tsx?)"/g
      )) {
        visit(join(dirname(file), path!));
      }
    };
    for (const entry of [
      "gates/run.ts",
      "gates/stories.spec.ts",
      "gates/playwright.config.ts",
      "gates/contact-sheet.ts",
    ]) {
      visit(join(repo, entry));
    }

    expect(reached.size).toBeGreaterThan(5);
    expect(reached).not.toContain(judge);
  });
});
