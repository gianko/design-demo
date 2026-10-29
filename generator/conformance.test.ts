// @vitest-environment node
// Brief conformance (gate 5, ADR 0014): the judge's request for each screen
// state, and its verdicts parsed from a recorded reply. No test calls the
// live model.

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import type Anthropic from "@anthropic-ai/sdk";
import { describe, expect, it } from "vitest";
import { judgeScreen } from "./conformance.ts";
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
      expect(prefix).toContain(
        "Hierarchy reads from size and weight: one clear title, then content."
      );
      expect(prefix).toContain(
        "Density fits the audience: dense for the admin, roomy for the contractor."
      );
      expect(prefix).toContain(
        "The accent appears only on the primary action, selection and focus."
      );
      expect(prefix).toContain("A shadow means it floats, never just a box.");
      expect(prefix).toContain(
        "Copy is second person and specific; errors say what happened and what to do next."
      );
      expect(prefix).toContain("Nothing repeats itself");
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
    expect(result.score).toEqual({ passed: 10, of: 12 });
    // 1650 input, 900 output and 4300 cache-read tokens at Opus 5.5's
    // prices, twice.
    expect(first!.call).toMatchObject({
      usage: { input: 1650, output: 900, cacheRead: 4300, cacheWrite: 0 },
      requestId: "req_recorded",
      stopReason: "end_turn",
    });
    expect(result.cost).toBeCloseTo(2 * 0.02546, 6);
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

  it("leaves gate 5 not run on verdicts that don't parse or don't quote the design brief", async () => {
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

    expect(notJson.states[0]).toMatchObject({
      judged: false,
      error: "malformed: not JSON",
    });
    expect(missing.states[0]).toMatchObject({ judged: false });
    expect((missing.states[0] as { error: string }).error).toMatch(
      /^malformed: .*copy/
    );
    expect(paraphrased.states[0]).toMatchObject({
      judged: false,
      error: "malformed: accent quotes nothing in the design brief",
    });
    for (const result of [notJson, missing, paraphrased]) {
      expect(result.ran).toBe(false);
    }
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
