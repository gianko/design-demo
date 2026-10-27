// spec § Keep, end to end: a rep that generate() passed (stubbed model, a
// one-table brief under its own slug) is kept, and then `pnpm gate <slug>`
// passes after `--update`, with no hand edits. `pnpm gate` lints and
// typechecks the whole repo, so the kept files are held to every gate a
// library component is. Its DataTable has a detail slot, so the kept
// screen also carries ADR 0011's open-sheet render, which gate 6 baselines
// like a screen state. Baselines go to a scratch directory.

import { spawnSync } from "node:child_process";
import { mkdirSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type Anthropic from "@anthropic-ai/sdk";
import { afterAll, describe, expect, it } from "vitest";
import { generate } from "./generate.ts";
import { main as keep } from "./keep.ts";
import { readScreenBrief } from "./screen-brief.ts";
import { repo } from "../repo.ts";

const slug = "keep-e2e";
const scratch = join(repo, ".generated", "vitest-keep-e2e");
const kept = join(repo, "src/screens", slug);
const baselines = "gates/out/keep-e2e-baselines";

afterAll(() => {
  for (const path of [scratch, kept, join(repo, baselines)]) {
    rmSync(path, { recursive: true, force: true });
  }
});

const brief = `---
audience: contractor
requires:
  components: [Screen, Stack, Heading, DataTable, Text, Sheet]
  transitions: [row-to-sheet]
---

# Keep e2e: my invoices

A contractor checks their invoices. The screen is titled "My invoices" and lists their invoices by number; clicking one opens its details, its number and due date.
`;

const bind = (path: string) => JSON.stringify({ bind: path });
const node = (
  id: string,
  component: string,
  parent: string | null,
  slot: string | null,
  props: Record<string, string> = {}
) => ({
  id,
  component,
  parent,
  slot,
  props: Object.entries(props).map(([name, value]) => ({ name, value })),
  when: [],
  action: null,
});

const uiSpec = {
  audience: "contractor",
  nodes: [
    node("screen", "Screen", null, null, { audience: '"contractor"' }),
    node("column", "Stack", "screen", "body"),
    node("title", "Heading", "column", "body", {
      text: '"My invoices"',
      level: "1",
    }),
    node("invoices", "DataTable", "column", "body", {
      rows: bind("yourInvoices"),
      columns: '["Invoice"]',
    }),
    node("number", "Text", "invoices", "cell", { text: bind("row.number") }),
    node("invoice", "Sheet", "invoices", "detail", {
      closeLabel: '"Close invoice details"',
    }),
    node("invoice-title", "Heading", "invoice", "title", {
      text: bind("row.number"),
      level: "2",
    }),
    node("due", "Text", "invoice", "body", { text: bind("row.dueLabel") }),
  ],
  states: [],
  actions: [],
};

// As a model might send it: fenced, and not formatted the way Prettier would.
const tsx = `\`\`\`tsx
import { DataTable, Heading, Screen, Sheet, Stack, Text, useFixtureData } from "../../index.ts";

export function KeepE2e() {
  const data = useFixtureData();
  return <Screen audience="contractor"><Stack><Heading level={1} text="My invoices" />
    <DataTable rows={data.yourInvoices} columns={["Invoice"]} cell={(row) => <Text text={row.number} />}
      detail={(row) => <Sheet closeLabel="Close invoice details" title={<Heading level={2} text={row.number} />}><Text text={row.dueLabel} /></Sheet>} />
  </Stack></Screen>;
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
  it("keeps a passed rep as a screen whose pnpm gate <slug> passes after --update, its open-sheet render baselined in both themes", async () => {
    mkdirSync(scratch, { recursive: true });
    const briefPath = join(scratch, `${slug}.md`);
    writeFileSync(briefPath, brief);
    const replies = [JSON.stringify(uiSpec), tsx];
    const workDir = join(scratch, "run");
    const trace = await generate(readScreenBrief(briefPath), {
      workDir,
      model: async () => ({
        message: message(replies.shift()!),
        requestId: null,
      }),
    });
    expect(trace.endReason, JSON.stringify(trace.attempts.at(-1))).toBe(
      "passed"
    );
    // The render pass rendered the open sheet too, at the audience's density.
    expect(
      trace.attempts.at(-1)!.renders!.map(({ theme, state }) => [theme, state])
    ).toEqual(
      expect.arrayContaining([
        ["light", "default, sheet open"],
        ["dark", "default, sheet open"],
      ])
    );

    expect(await keep([workDir], { log: () => {} })).toBe(0);

    const update = gate(["--update"], false);
    expect(update.status, update.stdout + update.stderr).toBe(0);
    // As CI runs it: a missing baseline would fail.
    const check = gate([], true);
    expect(check.status, check.stdout + check.stderr).toBe(0);
    // Two stories (the default and its open sheet) × 2 themes × 2 densities.
    expect(check.stdout).toMatch(/8 passed/);
    expect(
      readdirSync(join(repo, baselines), { recursive: true })
        .map(String)
        .filter((file) => file.includes("default-sheet-open"))
        .map((file) => file.split("/").at(-1))
        .sort()
    ).toEqual([
      "screens-keep-e2e--default-sheet-open--dark-admin.png",
      "screens-keep-e2e--default-sheet-open--dark-contractor.png",
      "screens-keep-e2e--default-sheet-open--light-admin.png",
      "screens-keep-e2e--default-sheet-open--light-contractor.png",
    ]);
  });
});
