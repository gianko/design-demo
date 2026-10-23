// @vitest-environment node
// `pnpm generate <screen brief>` with a stubbed model: it prints each step's
// gate results and the pass criteria, and exits 0 only on `passed` with the
// pass criteria met.

import { randomUUID } from "node:crypto";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import type Anthropic from "@anthropic-ai/sdk";
import { afterEach, describe, expect, it } from "vitest";
import { main } from "./cli.ts";
import type { Model } from "./model.ts";

const repo = resolve(import.meta.dirname, "..");
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
    usage: { input_tokens: 1, output_tokens: 1 },
  } as Anthropic.Message;
}

function stub(...texts: string[]): Model {
  return async () => ({ message: reply(texts.shift()!), requestId: null });
}

const cleanup: string[] = [];
afterEach(() => {
  for (const path of cleanup.splice(0))
    rmSync(path, { recursive: true, force: true });
});

// A screen brief under a unique slug, so each run gets its own run dir.
function brief(text: string) {
  const dir = join(repo, ".generated", `vitest-briefs-${randomUUID()}`);
  mkdirSync(dir, { recursive: true });
  cleanup.push(dir);
  const slug = `cli-${randomUUID().slice(0, 8)}`;
  const path = join(dir, `${slug}.md`);
  writeFileSync(path, text);
  return { path };
}

async function run(briefPath: string, model: Model) {
  const lines: string[] = [];
  const code = await main([briefPath], {
    model,
    log: (line) => lines.push(line),
    onRunDir: (dir) => cleanup.push(dir),
  });
  return { code, output: lines.join("\n") };
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
      /code · attempt 1 · gate 2 pass · gate 3 pass · gate 7 pass/
    );
    expect(output).toMatch(/pass criteria: met/);
    expect(output).toMatch(/outcome: passed/);
    expect(output).toMatch(/\.generated\/\d{8}-\d{6}-cli-/);
    expect(code).toBe(0);
  }, 60_000);

  it("exits non-zero on passed when the pass criteria aren't met", async () => {
    const { path } = brief(
      smokeBrief.replace(
        "components: [Screen, Text]\n  states: []",
        "components: [Screen, Text, Card]\n  states: [empty]"
      )
    );

    const { code, output } = await run(path, stub(uiSpec, tsxFor(path)));

    expect(output).toMatch(/outcome: passed/);
    expect(output).toMatch(
      /pass criteria: not met · missing component Card, state empty/
    );
    expect(code).toBe(1);
  }, 60_000);

  it("exits non-zero when a gate fails, printing the failure", async () => {
    const { path } = brief(smokeBrief);
    const failing = tsxFor(path)
      .replace("<Text", "<div><Text")
      .replace("/>", "/></div>");

    const { code, output } = await run(path, stub(uiSpec, failing));

    expect(output).toMatch(/gate 2 fail/);
    expect(output).toMatch(/gate 2 · no-restricted-syntax · L6:7/);
    expect(output).toMatch(/outcome: code-attempts-exhausted/);
    expect(code).toBe(1);
  }, 60_000);
});
