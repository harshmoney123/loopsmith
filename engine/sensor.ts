import type { Signal } from "@/lib/types";

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
  return (fixtures as Signal[]).filter((s) => sources.includes(s.source));
}
