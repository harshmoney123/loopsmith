import type { Signal, ToolOutcome } from "@/lib/types";
import type { Connector, ConnectorStatus } from "./types";
import { slack } from "./slack";
import { notion } from "./notion";
import { gmail } from "./gmail";
import { calendar } from "./calendar";
import { fathom } from "./fathom";
import { stripe } from "./stripe";

/**
 * The connector registry — the real sensor + tools layer. The engine depends on
 * these two functions, not on any provider. Add a connector here and it's
 * available to every loop; if its creds are absent it's simply skipped and the
 * engine falls back to fixtures.
 */
export const CONNECTORS: Record<string, Connector> = {
  slack,
  notion,
  gmail,
  calendar,
  fathom,
  stripe,
};

/** Which connectors are wired vs need credentials (for the UI + /api/connectors). */
export function connectorStatus(): ConnectorStatus[] {
  return Object.values(CONNECTORS).map((c) => ({
    source: c.source,
    label: c.label,
    configured: c.configured(),
    note: c.configured() ? "live" : c.note,
  }));
}

export function anyConfigured(sources?: string[]): boolean {
  const list = sources?.length ? sources.map((s) => CONNECTORS[s]).filter(Boolean) : Object.values(CONNECTORS);
  return list.some((c) => c.configured());
}

/**
 * SENSOR LAYER (live): pull the most recent real signals across the requested
 * sources, newest first. Returns [] if nothing is configured or nothing came
 * back — callers fall back to fixtures so the demo always runs.
 */
export async function readLiveSignals(sources: string[], limit = 8): Promise<Signal[]> {
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
 * Defaults to dry-run (drafts, never sends) for demo safety.
 */
export async function dispatchAction(tool: string, desc: string, dryRun = true): Promise<ToolOutcome> {
  const [source, verb] = tool.split(".");
  const c = CONNECTORS[source];
  if (c?.write) return c.write(verb || "action", desc, dryRun);
  return { tool, ok: true, result: `dry-run · would ${tool}: ${desc}` };
}
