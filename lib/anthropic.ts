import Anthropic from "@anthropic-ai/sdk";

/**
 * Single Opus 4.8 client + helpers. Streaming is the default so the UI gets a
 * live chat-typing effect (the way Emma's chat feels).
 */
export const MODEL = "claude-opus-4-8";

let _client: Anthropic | null = null;
export function client(): Anthropic {
  if (!_client) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not set");
    _client = new Anthropic({ apiKey });
  }
  return _client;
}

/**
 * Stream a completion from Opus 4.8, invoking onToken for each text delta and
 * returning the full text. effort:"low" keeps the live demo snappy.
 */
export async function streamText(opts: {
  system: string;
  user: string;
  onToken: (delta: string) => void;
  maxTokens?: number;
}): Promise<string> {
  const stream = client().messages.stream({
    model: MODEL,
    max_tokens: opts.maxTokens ?? 1600,
    system: opts.system,
    output_config: { effort: "low" },
    messages: [{ role: "user", content: opts.user }],
  });

  stream.on("text", (delta) => opts.onToken(delta));

  const final = await stream.finalMessage();
  const text = final.content.find((b) => b.type === "text");
  return text && text.type === "text" ? text.text : "";
}

/** A JSON Schema object (the subset structured outputs supports). */
export type JsonSchema = Record<string, unknown>;

/**
 * Call Opus 4.8 and get back a schema-valid object of type T. Used by the
 * builder's interview, where we need a reliable shape (next question OR spec).
 */
export async function structured<T>(opts: {
  system: string;
  user: string;
  schema: JsonSchema;
  maxTokens?: number;
}): Promise<T> {
  const res = await client().messages.create({
    model: MODEL,
    max_tokens: opts.maxTokens ?? 2000,
    system: opts.system,
    output_config: {
      effort: "low",
      format: { type: "json_schema", schema: opts.schema },
    },
    messages: [{ role: "user", content: opts.user }],
  });
  const text = res.content.find((b) => b.type === "text");
  if (!text || text.type !== "text") throw new Error("model returned no text block");
  return JSON.parse(text.text) as T;
}
