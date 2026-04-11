/**
 * LLM call wrapper — Anthropic Messages API.
 *
 * Models:
 *   - REASONER_MODEL (default: claude-sonnet-4-6) — Deep Reasoner in consultation
 *   - PICKER_MODEL (default: claude-haiku-4-5) — Glyph Picker (fast + cheap)
 *   - LLM_MODEL (default: claude-haiku-4-5) — Compression functions
 *
 * Requires env var: ANTHROPIC_API_KEY
 */

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface LLMOptions {
  model?: string;
  maxTokens?: number;
  temperature?: number;
}

interface LLMResult {
  content: string;
  inputTokens: number;
  outputTokens: number;
  model: string;
}

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
const DEFAULT_MODEL = Deno.env.get("LLM_MODEL") ?? "claude-haiku-4-5-20251001";

export async function chat(
  messages: ChatMessage[],
  options: LLMOptions = {}
): Promise<LLMResult> {
  const model = options.model ?? DEFAULT_MODEL;
  const maxTokens = options.maxTokens ?? 1024;
  const temperature = options.temperature ?? 0.7;

  if (!ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY is not set");
  }

  // Separate system message from conversation messages
  const systemMessage = messages.find((m) => m.role === "system");
  const conversationMessages = messages
    .filter((m) => m.role !== "system")
    .map((m) => ({ role: m.role, content: m.content }));

  const body: Record<string, unknown> = {
    model,
    max_tokens: maxTokens,
    temperature,
    messages: conversationMessages,
  };

  if (systemMessage) {
    body.system = systemMessage.content;
  }

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Anthropic API error ${response.status}: ${errorBody}`);
  }

  const data = await response.json();

  const textBlock = data.content?.find(
    (block: { type: string }) => block.type === "text"
  );

  return {
    content: textBlock?.text ?? "",
    inputTokens: data.usage?.input_tokens ?? 0,
    outputTokens: data.usage?.output_tokens ?? 0,
    model: data.model ?? model,
  };
}

/**
 * Convenience: call LLM with a system prompt + user message.
 */
export async function summarize(
  systemPrompt: string,
  userContent: string,
  options: LLMOptions = {}
): Promise<LLMResult> {
  return chat(
    [
      { role: "system", content: systemPrompt },
      { role: "user", content: userContent },
    ],
    options
  );
}
