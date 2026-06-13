import type { Signal, LoopSpec } from "@/lib/types";
import { structured, type JsonSchema } from "@/lib/anthropic";

/**
 * SENSOR LAYER (1/5)
 * Ingests raw signals from MCP connectors (Slack, Gmail, Fathom, Calendar, ...)
 * and normalizes them into Signal[]. Falls back to fixtures so the loop runs
 * offline during the demo (see PLAN.md §13 risk mitigation).
 */
export async function ingest(sources: string[]): Promise<Signal[]> {
  // TODO: wire MCP connectors per source. For now, load cached fixtures.
  const { default: fixtures } = await import("@/fixtures/signals.json").catch(
    () => ({ default: [] as Signal[] }),
  );
  const all = fixtures as Signal[];
  const matched = all.filter((s) => sources.includes(s.source));
  // A builder-generated loop may name sources we don't have fixtures for yet —
  // fall back to all sample signals so the loop still demonstrates end-to-end.
  return matched.length ? matched : all;
}

const SIGNALS_SCHEMA: JsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["signals"],
  properties: {
    signals: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["source", "actor", "text"],
        properties: {
          source: { type: "string" },
          actor: { type: "string" },
          text: { type: "string" },
        },
      },
    },
  },
};

/**
 * For a builder-generated loop, synthesize 5 realistic sample signals that match
 * the loop's domain + sensors — so a custom loop runs on relevant data, not the
 * GTM fixtures. Includes 1-2 deliberate "noise" items so signal selection shows.
 */
export async function synthesizeSignals(spec: LoopSpec): Promise<Signal[]> {
  const ts = new Date().toISOString();
  try {
    const res = await structured<{ signals: { source: string; actor: string; text: string }[] }>({
      system: [
        `Generate 5 realistic, varied sample signals for this self-improving loop, as if just ingested today.`,
        `Loop: ${spec.name} — ${spec.description}`,
        `Sources available: ${spec.sensors.join(", ")}. Use only these as the "source" value.`,
        `What matters: ${spec.decisionPolicy}`,
        `Make 3 genuinely matter (varied urgency) and 1-2 be low-value noise (logistics/FYI) so prioritization is visible. Each "text" is one concrete sentence with specifics (names, amounts, dates). "actor" is who/what produced it.`,
      ].join("\n"),
      user: `Produce the 5 signals now.`,
      schema: SIGNALS_SCHEMA,
      maxTokens: 1200,
    });
    return res.signals.map((s) => ({ source: s.source, actor: s.actor, text: s.text, ts }));
  } catch {
    return ingest(spec.sensors); // fall back to fixtures on any failure
  }
}
