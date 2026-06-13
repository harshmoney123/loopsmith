import type { Signal, LoopSpec } from "@/lib/types";
import { structured, type JsonSchema } from "@/lib/anthropic";
import { readLiveSignals } from "@/lib/connectors";

/**
 * SENSOR LAYER (1/5)
 * Ingests raw signals. Tries REAL connectors first (Slack/Gmail/Notion/Calendar/
 * Fathom/Stripe via env credentials — see lib/connectors), then falls back to
 * cached fixtures so the loop always runs offline (PLAN.md §13).
 */
export async function ingest(sources: string[]): Promise<Signal[]> {
  // Real connectors first — returns [] if nothing is configured/available.
  try {
    const live = await readLiveSignals(sources);
    if (live.length) return live;
  } catch {
    /* fall through to fixtures */
  }

  const { default: fixtures } = await import("@/fixtures/signals.json").catch(
    () => ({ default: [] as Signal[] }),
  );
  const all = fixtures as Signal[];
  const matched = all.filter((s) => sources.includes(s.source));
  // A builder-generated loop may name sources we don't have fixtures for yet —
  // fall back to all sample signals so the loop still demonstrates end-to-end.
  return matched.length ? matched : all;
}

/**
 * REAL-CONTEXT INGESTION — the path to genuine value with no OAuth.
 *
 * A non-technical user pastes their actual week (Slack snippets, emails, call
 * notes, calendar items) and the loop runs on THAT real data instead of
 * synthesized samples. Deterministic, dependency-free, and forgiving: any
 * reasonable paste produces grounded signals.
 *
 * Recognized shapes (mixed freely):
 *   - blank-line-separated blocks (each block = one signal)
 *   - "---" separators
 *   - leading source markers: "[slack] ...", "slack: ...", "Email from X: ...",
 *     "Call with Y — ...", "Calendar: ...", "Notion: ..."
 */
/**
 * Source markers must be LABELED — a bracketed tag ("[slack]"), a keyword + a
 * delimiter ("slack:"), or a recognized lead phrase ("Email from", "Call with").
 * A bare sentence-initial verb ("Call Sarah about pricing", "Email the team")
 * must NOT be mistaken for a marker and have its first word stripped (#5).
 */
const SOURCE_HINTS: { re: RegExp; source: string }[] = [
  { re: /^\s*(?:\[\s*slack\s*\]\s*:?\s*|slack\s*[:\-–]\s+)/i, source: "slack" },
  { re: /^\s*(?:\[\s*(?:e-?mail|gmail|inbox)\s*\]\s*:?\s*|(?:gmail|inbox)\s*[:\-–]\s+|e-?mail\s+from\s+|e-?mail\s*[:\-–]\s+)/i, source: "gmail" },
  { re: /^\s*(?:\[\s*(?:call|fathom|meeting|transcript)\s*\]\s*:?\s*|(?:fathom|meeting|transcript)\s*[:\-–]\s+|call\s+with\s+)/i, source: "fathom" },
  { re: /^\s*(?:\[\s*(?:calendar|cal|event)\s*\]\s*:?\s*|(?:calendar|cal|event)\s*[:\-–]\s+)/i, source: "calendar" },
  { re: /^\s*(?:\[\s*(?:notion|doc|note)\s*\]\s*:?\s*|(?:notion|doc)\s*[:\-–]\s+)/i, source: "notion" },
  { re: /^\s*(?:\[\s*(?:stripe|payment|invoice)\s*\]\s*:?\s*|(?:stripe|payment|invoice)\s*[:\-–]\s+)/i, source: "stripe" },
];

const MAX_SIGNALS = 40;

export function parseRawContext(raw: string): Signal[] {
  const ts = new Date().toISOString();
  if (!raw || !raw.trim()) return [];

  // Split into blocks on blank lines or "---" rules.
  const blocks = raw
    .replace(/\r\n/g, "\n")
    .split(/\n\s*(?:-{3,}|\*{3,})\s*\n|\n{2,}/)
    .map((b) => b.trim())
    .filter(Boolean);

  // If the user pasted one big block with many single lines and no blank-line
  // structure, fall back to treating each non-trivial line as a signal.
  const candidates =
    blocks.length <= 1
      ? raw.split("\n").map((l) => l.trim()).filter((l) => l.length > 3)
      : blocks;

  const signals: Signal[] = [];
  for (const block of candidates) {
    if (signals.length >= MAX_SIGNALS) break;
    let text = block;
    let source = "note";
    let actor: string | undefined;

    for (const hint of SOURCE_HINTS) {
      if (hint.re.test(text)) {
        source = hint.source;
        text = text.replace(hint.re, "");
        break;
      }
    }

    // "from X:" / "X said:" / "X —" actor extraction (best-effort).
    const fromMatch = text.match(/^\s*(?:from\s+)?([A-Z][\w .'-]{1,40}?)\s*[:\-–]\s+/);
    if (fromMatch && fromMatch[1].split(" ").length <= 5) {
      actor = fromMatch[1].trim();
      text = text.slice(fromMatch[0].length);
    }

    text = text.trim();
    if (text.length < 3) continue;
    signals.push(actor ? { source, ts, actor, text } : { source, ts, text });
  }

  return signals;
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
  // Prefer REAL connector data when this loop's sensors are connected — a
  // builder-generated loop then runs on live signals, not synthesized samples.
  try {
    const live = await readLiveSignals(spec.sensors);
    if (live.length) return live;
  } catch {
    /* fall through to synthesis */
  }

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
