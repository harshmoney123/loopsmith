import type { Signal } from "@/lib/types";
import { env, type Connector } from "./types";

/**
 * Stripe connector — recent account events (new customers, payments, disputes).
 * Activates with STRIPE_SECRET_KEY. Read-only.
 */
export const stripe: Connector = {
  source: "stripe",
  label: "Stripe",
  note: "set STRIPE_SECRET_KEY",

  configured() {
    return !!env("STRIPE_SECRET_KEY");
  },

  async read(limit) {
    const key = env("STRIPE_SECRET_KEY");
    if (!key) return [];
    try {
      const res = await fetch(`https://api.stripe.com/v1/events?limit=${limit}`, {
        headers: { Authorization: `Bearer ${key}` },
      }).then((r) => r.json() as Promise<{ data?: Record<string, unknown>[] }>);
      return (res.data || []).slice(0, limit).map((e) => ({
        source: "stripe",
        ts: new Date(((e.created as number) || Date.now() / 1000) * 1000).toISOString(),
        actor: "Stripe",
        text: `Stripe event: ${(e.type as string) || "event"}`,
        meta: { id: e.id },
      })) as Signal[];
    } catch {
      return [];
    }
  },
};
