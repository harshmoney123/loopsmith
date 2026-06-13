import type { Signal, ToolOutcome } from "@/lib/types";
import type { Connector, ConnectorStatus } from "./types";
import { loadCreds, setCred } from "./types";
import { slack } from "./slack";
import { notion } from "./notion";
import { gmail } from "./gmail";
import { calendar } from "./calendar";
import { fathom } from "./fathom";

/**
 * The connector registry — the real sensor + tools layer. The engine depends on
 * these two functions, not on any provider. (Stripe removed per product scope.)
 */
export const CONNECTORS: Record<string, Connector> = {
  slack,
  notion,
  gmail,
  calendar,
  fathom,
};

/** How each connector is connected from the UI. */
export type ConnectMethod = "oauth" | "token";

export interface ConnectorMeta {
  source: string;
  label: string;
  method: ConnectMethod;
  /** Token-paste fields (for method "token"). */
  fields?: { key: string; label: string; placeholder: string; required?: boolean }[];
  /** OAuth provider id (for method "oauth"). */
  oauth?: "google" | "slack";
  blurb: string;
}

export const CONNECTOR_META: ConnectorMeta[] = [
  { source: "slack", label: "Slack", method: "oauth", oauth: "slack", blurb: "Read recent channel messages.", fields: [{ key: "SLACK_BOT_TOKEN", label: "Bot token", placeholder: "xoxb-…" }] },
  { source: "gmail", label: "Gmail", method: "oauth", oauth: "google", blurb: "Read recent inbox + draft replies." },
  { source: "calendar", label: "Calendar", method: "oauth", oauth: "google", blurb: "Upcoming events." },
  { source: "notion", label: "Notion", method: "token", blurb: "Read recent pages + create tasks.", fields: [
    { key: "NOTION_TOKEN", label: "Integration token", placeholder: "ntn_… / secret_…", required: true },
    { key: "NOTION_TASKS_DB", label: "Tasks database ID (optional, enables task creation)", placeholder: "32-char id" },
  ] },
  { source: "fathom", label: "Fathom", method: "token", blurb: "Recent call summaries.", fields: [{ key: "FATHOM_API_KEY", label: "API key", placeholder: "fathom key", required: true }] },
];

/** Which connectors are wired vs need credentials (for the UI + /api/connectors). */
export async function connectorStatus(): Promise<ConnectorStatus[]> {
  await loadCreds();
  return Object.values(CONNECTORS).map((c) => ({
    source: c.source,
    label: c.label,
    configured: c.configured(),
    note: c.configured() ? "live" : c.note,
  }));
}

/** Persist a connected credential (token paste / OAuth callback). */
export async function connect(key: string, value: string): Promise<void> {
  await setCred(key, value);
}

/**
 * SENSOR LAYER (live): pull the most recent real signals across the requested
 * sources, newest first. Returns [] if nothing is configured/returned — callers
 * fall back to fixtures so the demo always runs.
 */
export async function readLiveSignals(sources: string[], limit = 8): Promise<Signal[]> {
  await loadCreds();
  const active = sources
    .map((s) => CONNECTORS[s])
    .filter((c): c is Connector => !!c && c.configured());
  if (!active.length) return [];

  const per = Math.max(2, Math.ceil(limit / active.length));
  const batches = await Promise.all(active.map((c) => c.read(per).catch(() => [] as Signal[])));
  const all = batches.flat();
  all.sort((a, b) => (b.ts || "").localeCompare(a.ts || ""));
  return all.slice(0, limit);
}

/**
 * TOOLS LAYER (live): dispatch a "<source>.<verb>" action to its connector.
 * dryRun=true → drafts/no-ops (safe default). dryRun=false → real side-effect
 * (create a Notion task, draft a Gmail reply, …) when the connector is live.
 */
export async function dispatchAction(tool: string, desc: string, dryRun = true): Promise<ToolOutcome> {
  await loadCreds();
  const [source, verb] = tool.split(".");
  const c = CONNECTORS[source];
  if (c?.write && c.configured()) return c.write(verb || "action", desc, dryRun);
  return { tool, ok: true, result: `dry-run · would ${tool}: ${desc}` };
}
