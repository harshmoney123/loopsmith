import type { Signal } from "@/lib/types";
import { env, type Connector } from "./types";

/**
 * Fathom connector — recent meeting summaries. Activates with FATHOM_API_KEY.
 * (Endpoint shape mirrors Fathom's public API; returns [] gracefully if absent.)
 */
export const fathom: Connector = {
  source: "fathom",
  label: "Fathom",
  note: "set FATHOM_API_KEY",

  configured() {
    return !!env("FATHOM_API_KEY");
  },

  async read(limit) {
    const key = env("FATHOM_API_KEY");
    if (!key) return [];
    try {
      const res = await fetch(`https://api.fathom.video/v1/meetings?limit=${limit}`, {
        headers: { Authorization: `Bearer ${key}` },
      }).then((r) => r.json() as Promise<{ items?: Record<string, unknown>[]; meetings?: Record<string, unknown>[] }>);
      const items = res.items || res.meetings || [];
      return items.slice(0, limit).map((m) => ({
        source: "fathom",
        ts: (m.created_at as string) || (m.recorded_at as string) || new Date().toISOString(),
        actor: (m.title as string) || "Call",
        text: `Call — ${(m.title as string) || "meeting"}: ${(m.summary as string) || (m.action_items as string) || ""}`.trim(),
        meta: { id: m.id },
      })) as Signal[];
    } catch {
      return [];
    }
  },
};
