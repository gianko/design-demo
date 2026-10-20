# Research: agent runtime options

Resolves #5 (feeds #10, demo brief §9 Q5). Researched 2026-10-21 against first-party docs and the `gianko/agent-quiz-app` source at `3965ef9`.

**Question.** Which runtime gives the spec → code pipeline the least code: the Claude Agent SDK (TypeScript), a hand-rolled loop on the Messages API (including the SDK's tool runner), or the `agent-quiz-app` Ralph loop as-is?

**Criteria.** Lines of code we own; structured output for the UI spec step (Zod/ArkType); injecting gate failures as follow-up turns (repair loop); token/cost reporting per eval run; unattended CLI use. Current models only.

## TL;DR

- The pipeline in the brief is a **workflow, not an agent**. It has two model calls (screen brief → UI spec, then UI spec → TSX), and deterministic gates run between and after them. The model never needs to pick a tool or explore a filesystem, so an agent harness gives it nothing to use.
- On the Messages API this is two `client.messages.parse()` calls with `zodOutputFormat()`. The repair loop pushes the gate failures as a new user turn onto the same `messages` array. Cost is `response.usage` multiplied by a price table we keep in the repo. That comes to about 100–150 lines we own, with two dependencies (`@anthropic-ai/sdk`, `zod`). There is no beta API and no subprocess.
- The **Agent SDK** has every feature we need (`outputFormat`, streaming input or `resume` for follow-up turns, `total_cost_usd`, `maxBudgetUsd`, `permissionMode: "dontAsk"`). It doesn't save code, though: the gates, the repair policy and the eval accounting are ours whichever runtime runs them. It also adds a bundled Claude Code binary, filesystem settings loading that we'd have to switch off, and cost figures that the docs call "client-side estimates".
- **Ralph as-is doesn't fit.** It is built to pick one open GitHub issue, implement it, commit and close it. It has no schema-constrained output, gate failures only reach the next iteration through git log and issue text, and it throws away the cost data it receives. Adapting it means rewriting it as `claude -p --json-schema --resume`, which is just the Agent SDK driven from bash.
- **Surprise that matters for #11:** API structured outputs **reject recursive schemas**, and they cap complexity at 24 optional parameters and 16 union-typed parameters per request. A UI spec typed as a nested component tree, with each component's props as an exact schema, won't compile. The wire schema has to be a flat node list kept loose, and the exact per-component prop check moves into the registry gate (gate 1), checked locally with Zod.

## Options compared

| Criterion | Hand-rolled on Messages API | Claude Agent SDK (TS) | Ralph loop as-is |
| --- | --- | --- | --- |
| Code we own (estimate) | ~100–150 LOC TS: two `parse` calls, one generic repair loop, price table | ~80–130 LOC TS: `query()` wrapper, result-message handling, options hygiene. The gates, repair policy and accounting are still ours | ~40 LOC bash exists, but it does the wrong job. A fit-for-purpose version is a rewrite |
| Structured output for the UI spec | `messages.parse` + `zodOutputFormat(Schema)` → typed `parsed_output`, with constrained decoding on the API side [S1][S2] | `outputFormat: { type: "json_schema", schema }`. Validated against JSON Schema draft-07 with re-prompting, result in `structured_output` on the result message. For Zod, convert with `z.toJSONSchema(..., { target: "draft-7" })` and re-parse yourself [S4] | None. Could add `--output-format json --json-schema` [S7], but the script doesn't use it |
| Gate failures → follow-up turn | Append the assistant `content` unchanged, then a `user` turn with the failures, then call again. You control the whole transcript [S3] | Streaming input (`prompt: AsyncIterable<SDKUserMessage>` or `streamInput()`), or `resume: sessionId` [S5] | Only indirectly: the next iteration's prompt contains `git log -n 5` plus open-issue text [S9] |
| Token/cost per eval run | Exact tokens per response from `usage` (`input_tokens`, `output_tokens`, `cache_creation_input_tokens`, `cache_read_input_tokens`) [S10]. We multiply by list prices [S11] | `total_cost_usd` and `modelUsage` on each result. The docs say these are "client-side estimates, not authoritative billing data". Per-step `output_tokens` is a placeholder, and resumed sessions report the whole session's running total [S6] | The final `result` JSON includes `total_cost_usd` [S7], but `afk.sh` only extracts `.result` and drops the rest [S9] |
| Unattended CLI | `tsx` script with an API key, no prompts. There are no tools, so there's nothing to grant permission for | Yes: `permissionMode: "dontAsk"`, `permissionPrompts: "none"`, `maxTurns`, `maxBudgetUsd`, `settingSources: []` [S5]. Spawns a bundled native Claude Code binary [S5] | Yes. Runs `docker sandbox run claude ... --print`, which is good isolation for a coding agent [S9] |
| Reproducibility across eval runs | Full: we own the exact system prompt, params and transcript | Default `-p`/SDK runs pick up project hooks, skills, `CLAUDE.md` and MCP servers unless you opt out (`--bare` / `settingSources: []`) [S7][S5] | Low: each run depends on repo state, git history and open issues |
| Auth | API key | API key. Products built on the SDK may not use claude.ai login unless Anthropic has approved it [S8]. `--bare` never reads OAuth [S7] | Whatever the local `claude` is logged in with |

### ArkType vs Zod

Prefer Zod. The SDK ships `zodOutputFormat()` (from `@anthropic-ai/sdk/helpers/zod`), which converts the schema for the request and validates and parses the response [S2][S12]. ArkType has no helper. With ArkType you'd pass its JSON Schema export through `jsonSchemaOutputFormat()`, which "doesn't validate responses" [S2], and then run ArkType validation yourself. It works, but it adds code. The docs don't state which Zod major version the SDK helper needs, so check that at install [S12].

## Constraints that shape the design

1. **No recursive schemas; complexity caps.** Structured outputs support `$ref`/`$defs` for internal references only, and "Recursive schemas" are listed as not supported. The limits across all strict schemas in one request are 24 optional parameters, 16 parameters with union types (`anyOf` or type arrays), and 20 strict tools. Going over returns 400 "Schema is too complex for compilation" [S2]. The SDK strips only unsupported *constraints* such as `minLength` and enforces them locally [S1]. It doesn't fix recursion or complexity. **Implication for #11:** keep the wire schema (sent to the API) separate from the registry schema (enforced by gate 1):
   - **Wire schema:** a flat `nodes: [{ id, component: enum(registry names), parent: id | null, slot, props: [{ name, value }] }]`, which is small and has no recursion.
   - **Registry schema:** the exact per-component Zod schemas generated from the library, run locally as the registry/schema gate. Its failures feed the repair loop like any other gate.

   I didn't verify whether the Agent SDK's `outputFormat` relies on constrained decoding, and so whether it has the same limits. Its docs point to the same limitations list [S4].
2. **Claude Opus 5.5 request rules** [S1][S13]:
   - Forced `tool_choice` (`any`/`tool`) returns 400, so the old "force a tool call to get JSON" trick is gone. Use `output_config.format`.
   - Thinking can't be disabled. `effort` defaults to `medium`, so set it explicitly per step.
   - Thinking blocks are bound to the conversation (preserved thinking). The repair loop has to be append-only: push `response.content` back unchanged and never edit earlier turns. The design below does that by construction.
3. **Caching suits eval runs.** Put the design brief and the registry in a stable `system` prefix with `cache_control`, so K reps × N screen briefs share one cached prefix. Opus 5.5 cache hits cost $0.20/MTok against $4 base input [S11]. Verify the hits with `usage.cache_read_input_tokens` [S1].
4. **Prices to check into the repo** (per MTok, as of 2026-10-21) [S11]:

   | Model | Input | 5-minute cache write | Cache hit | Output |
   | --- | --- | --- | --- | --- |
   | `claude-opus-5-5` | $4 | $5 | $0.20 | $20 |
   | `claude-sonnet-5-5` | $2 | $2.50 | $0.10 | $10 |
   | `claude-haiku-5-5` (prompts ≤100K tokens) | $0.10 | $0.125 | $0.01 | $0.50 |

   Authoritative billing is only available from the Usage & Cost Admin API [S6]. Per-run cost computed from `usage` and list prices is accurate enough for the eval table.

## What Ralph actually is (source read, not executed)

From `gianko/agent-quiz-app@3965ef9` [S9]:

- **`ralph/afk.sh <iterations>`** loops N times:
  - It builds a prompt from `git log -n 5`, the open issues as JSON from `gh issue list`, and `ralph/prompt.md`.
  - It runs `docker sandbox run claude . -- --verbose --print --output-format stream-json "<prompt>"` and tees the stream to a temp file.
  - It extracts `.result` with jq and stops when the result contains `<promise>NO MORE TASKS</promise>`.
- **`ralph/once.sh`** does the same prompt assembly but runs `claude --permission-mode acceptEdits` interactively.
- **`ralph/prompt.md`** says to pick one AFK issue by priority, explore, do red/green/refactor, run `pnpm run test` and `pnpm run typecheck`, commit, then close the issue or comment on it. It ends with "ONLY WORK ON A SINGLE TASK."

Ralph's unit of work is an issue. For the eval runner it's a screen brief × rep, and the runner needs per-attempt gate results and costs back as data. Ralph is the right tool for *building* the design system: the brief's "unattended Claude Code loop, spec-first, issue-tracked" pattern, covered by #13 (prototype how Claude Code builds a component against the design brief). It isn't the runtime for the generation pipeline.

## Recommendation (for the human to ratify in #10)

**Hand-roll the spec → code pipeline on the Messages API, as a two-step workflow with no agent loop:**

- `@anthropic-ai/sdk` `messages.parse()` + `zodOutputFormat()` for both steps, on `claude-opus-5-5` with explicit `effort`.
- A generic repair loop that appends gate failures as a user turn.
- Per-attempt `usage` logged and priced from a checked-in table.
- A `tsx` CLI that the eval runner (#16) calls directly.

Keep the Ralph / Claude Code loop for building the design system. Don't use it as the generation runtime. Drop in the SDK tool runner (`client.beta.messages.toolRunner` + `betaZodTool`) only if the code step later needs tools, such as looking up component docs on demand. That's about 10 lines and doesn't change the shape.

**Tension to flag:** the brief marks "Agent loop reuses the pattern from `gianko/agent-quiz-app`" as DECIDED, and leaves "Agent SDK or custom loop" open. This recommendation keeps the decided parts of the pattern (unattended, spec-first). It moves "issue-tracked" to the build loop, because an eval run of a screen brief isn't an issue.

## Minimal code shape (sketch, not run)

```ts
// src/pipeline/generate.ts
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { WireSpec } from "./wire-spec";        // flat node list (#11), no recursion
import { CodeOutput } from "./code-output";    // z.object({ files: z.array(z.object({ path, contents })) })
import { registryGate, codeGates, type GateFailure } from "../gates"; // gate 1; gates 2-4
import { SYSTEM_PREFIX } from "./prompt";      // design brief + registry: stable, cacheable

const client = new Anthropic(); // ANTHROPIC_API_KEY
const MODEL = "claude-opus-5-5";
const PRICE = { in: 4, cacheWrite: 5, cacheRead: 0.2, out: 20 }; // $/MTok, pricing page 2026-10-21

export type Attempt = { step: "spec" | "code"; n: number; failures: GateFailure[]; usage: Anthropic.Usage; usd: number };

const usd = (u: Anthropic.Usage) =>
  (u.input_tokens * PRICE.in + (u.cache_creation_input_tokens ?? 0) * PRICE.cacheWrite +
   (u.cache_read_input_tokens ?? 0) * PRICE.cacheRead + u.output_tokens * PRICE.out) / 1e6;

/** One step = call, gate, feed failures back as a follow-up turn, up to maxAttempts. */
async function repairLoop<S extends z.ZodType>(
  step: Attempt["step"], messages: Anthropic.MessageParam[], schema: S,
  gate: (out: z.infer<S>) => Promise<GateFailure[]>, log: Attempt[], maxAttempts: number,
): Promise<z.infer<S> | null> {
  for (let n = 1; n <= maxAttempts; n++) {
    const res = await client.messages.parse({
      model: MODEL,
      max_tokens: 16000,
      system: [{ type: "text", text: SYSTEM_PREFIX, cache_control: { type: "ephemeral" } }],
      output_config: { effort: step === "spec" ? "medium" : "high", format: zodOutputFormat(schema) },
      messages,
    });
    messages.push({ role: "assistant", content: res.content }); // append-only: preserved thinking
    const failures = res.parsed_output == null
      ? [{ gate: "output", message: `no parsed output (stop_reason=${res.stop_reason})` }]
      : await gate(res.parsed_output);
    log.push({ step, n, failures, usage: res.usage, usd: usd(res.usage) });
    if (failures.length === 0) return res.parsed_output;
    messages.push({ role: "user", content: `These gates failed. Fix them and emit the full output again.\n\n${
      failures.map((f) => `- [${f.gate}] ${f.message}`).join("\n")}` });
  }
  return null;
}

export async function generateScreen(screenBrief: string, maxAttempts = 3) {
  const log: Attempt[] = [];
  const spec = await repairLoop("spec",
    [{ role: "user", content: `Screen brief:\n${screenBrief}\n\nEmit the UI spec.` }],
    WireSpec, async (s) => registryGate(s), log, maxAttempts);
  if (!spec) return { ok: false as const, log };

  const code = await repairLoop("code",
    [{ role: "user", content: `UI spec:\n${JSON.stringify(spec)}\n\nWrite the screen as TSX using only the library barrel and tokens.` }],
    CodeOutput, (c) => codeGates(c.files), log, maxAttempts); // writes files to a scratch dir, runs lint/tsc/axe
  return { ok: code !== null, spec, code, log, usd: log.reduce((t, a) => t + a.usd, 0) };
}
```

The eval runner (#16) calls `generateScreen` K times per brief and writes `log` into `evals/results/<date>.json`. That gives attempts-to-pass, per-gate pass/fail and cost with no further plumbing. Wall time is the runner's own timer. Before writing the real code, add the default refusal fallback (`fallbacks: "default"` with the `server-side-fallback-2026-07-01` beta) and a `refusal` stop-reason branch [S1].

## Open points (not blocking #10)

- Does the Agent SDK's `outputFormat` accept recursive schemas, given it validates locally against draft-07 with re-prompting? Moot if #11 goes flat.
- Can `messages.parse` stream? The SDK helpers doc links a streaming structured-outputs example but doesn't describe it [S12]. Non-streaming with `max_tokens: 16000` is fine for one screen. If code output grows past that, check `examples/structured-outputs-streaming.ts`.
- The SDK's Zod version requirement for `zodOutputFormat` [S12].

## Sources

- [S1] Claude API skill reference (bundled with Claude Code 2.1.305): TypeScript tool use, structured outputs, Opus 5.5 behaviour, caching. Matches the live docs below.
- [S2] Structured outputs, JSON Schema limitations and complexity limits: https://platform.claude.com/docs/en/build-with-claude/structured-outputs
- [S3] Tool runner, including "Taking over message history", `pushMessages` / `setMessagesParams` and `max_iterations`: https://platform.claude.com/docs/en/agents-and-tools/tool-use/tool-runner
- [S4] Agent SDK structured outputs: https://code.claude.com/docs/en/agent-sdk/structured-outputs
- [S5] Agent SDK TypeScript reference (`query()`, `Options`, bundled binary): https://code.claude.com/docs/en/agent-sdk/typescript
- [S6] Agent SDK cost tracking: https://code.claude.com/docs/en/agent-sdk/cost-tracking
- [S7] Run Claude Code programmatically (`-p`, `--bare`, `--json-schema`, `--resume`): https://code.claude.com/docs/en/headless
- [S8] Agent SDK overview (auth note): https://code.claude.com/docs/en/agent-sdk/overview
- [S9] `gianko/agent-quiz-app@3965ef9`: `ralph/afk.sh`, `ralph/once.sh`, `ralph/prompt.md`: https://github.com/gianko/agent-quiz-app/tree/3965ef9f391c12fe0ff0855bc46b7d892bdae345/ralph
- [S10] Messages API response `usage`: https://platform.claude.com/docs/en/api/messages
- [S11] Pricing: https://platform.claude.com/docs/en/about-claude/pricing
- [S12] TypeScript SDK helpers (`zodOutputFormat`, `betaZodTool`, `toolRunner`): https://github.com/anthropics/anthropic-sdk-typescript/blob/main/helpers.md
- [S13] Migration guide, Claude Opus 5.5: https://platform.claude.com/docs/en/about-claude/models/migration-guide
