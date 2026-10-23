// The one seam between the generator and the Messages API (ADR 0003): a
// request in, the finished message out. Tests stub it; the CLI uses the SDK.

import Anthropic from "@anthropic-ai/sdk";

export type Model = (
  params: Anthropic.MessageCreateParamsNonStreaming
) => Promise<{ message: Anthropic.Message; requestId: string | null }>;

// Streamed, since a 32k or 64k max_tokens can outlast a plain request's
// timeout; the caller only ever sees the final message. The key comes from
// ANTHROPIC_API_KEY, which `pnpm generate` loads from the gitignored .env.
export function anthropicModel(client = new Anthropic()): Model {
  return async (params) => {
    const stream = client.messages.stream(params);
    const message = await stream.finalMessage();
    return { message, requestId: stream.request_id ?? null };
  };
}
