// spec § Keep, end to end: a rep that generate() passed (stubbed model, the
// smoke brief under its own slug) is kept, and then `pnpm gate <slug>`
// passes after `--update`, with no hand edits. `pnpm gate` lints and
// typechecks the whole repo, so the kept files are held to every gate a
// library component is. Baselines go to a scratch directory.

import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import type Anthropic from "@anthropic-ai/sdk";
import { afterAll, describe, expect, it } from "vitest";
import { generate } from "./generate.ts";
import { main as keep } from "./keep.ts";
import { readScreenBrief } from "./screen-brief.ts";

const repo = resolve(import.meta.dirname, "..");
const slug = "keep-e2e";
const scratch = join(repo, ".generated", "vitest-keep-e2e");
const kept = join(repo, "src/screens", slug);
const baselines = "gates/out/keep-e2e-baselines";

afterAll(() => {
  for (const path of [scratch, kept, join(repo, baselines)]) {
    rmSync(path, { recursive: true, force: true });
  }
});

const uiSpec = {
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

// As a model might send it: fenced, and not formatted the way Prettier would.
const tsx = `\`\`\`tsx
import { Screen, Text } from "../../index.ts";

export function KeepE2e() {
  return <Screen audience="contractor"><Text text="Welcome back. Your invoices and payments will show up here." /></Screen>;
}
\`\`\``;

function message(text: string): Anthropic.Message {
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

function gate(args: string[], ci: boolean) {
  return spawnSync("pnpm", ["gate", slug, ...args], {
    cwd: repo,
    encoding: "utf8",
    env: { ...process.env, CI: ci ? "1" : "", GATE_BASELINES: baselines },
  });
}

describe("pnpm keep", () => {
  it("keeps a passed rep as a screen whose pnpm gate <slug> passes after --update", async () => {
    mkdirSync(scratch, { recursive: true });
    const briefPath = join(scratch, `${slug}.md`);
    writeFileSync(
      briefPath,
      readFileSync(join(import.meta.dirname, "fixtures/smoke.md"), "utf8")
    );
    const replies = [JSON.stringify(uiSpec), tsx];
    const workDir = join(scratch, "run");
    const trace = await generate(readScreenBrief(briefPath), {
      workDir,
      model: async () => ({
        message: message(replies.shift()!),
        requestId: null,
      }),
    });
    expect(trace.endReason).toBe("passed");

    expect(await keep([workDir], { log: () => {} })).toBe(0);

    const update = gate(["--update"], false);
    expect(update.status, update.stdout + update.stderr).toBe(0);
    // As CI runs it: a missing baseline would fail.
    const check = gate([], true);
    expect(check.status, check.stdout + check.stderr).toBe(0);
    expect(check.stdout).toMatch(/4 passed/);
  });
});
