import type { Signal } from "@/lib/types";
import { type Connector } from "./types";
import { googleConfigured, googleAccessToken } from "./google";

/**
 * Gmail connector — reads recent inbox threads via the Gmail REST API.
 * Activates when Google OAuth (incl. a refresh token) is configured.
 */
export const gmail: Connector = {
  source: "gmail",
  label: "Gmail",
  note: "set GOOGLE_REFRESH_TOKEN (gmail.readonly) — client id/secret already present",

  configured() {
    return googleConfigured();
  },

  async read(limit) {
    if (!googleConfigured()) return [];
    try {
      const token = await googleAccessToken();
      const h = { Authorization: `Bearer ${token}` };
      const list = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=${limit}&q=newer_than:7d category:primary`,
        { headers: h },
      ).then((r) => r.json() as Promise<{ messages?: { id: string }[] }>);

      const ids = (list.messages || []).slice(0, limit);
      const out: Signal[] = [];
      for (const { id } of ids) {
        const msg = await fetch(
          `https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}?format=metadata&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=Date`,
          { headers: h },
        ).then((r) => r.json() as Promise<{ payload?: { headers?: { name: string; value: string }[] }; snippet?: string; internalDate?: string }>);
        const hdr = (n: string) => msg.payload?.headers?.find((x) => x.name === n)?.value ?? "";
        out.push({
          source: "gmail",
          ts: msg.internalDate ? new Date(Number(msg.internalDate)).toISOString() : new Date().toISOString(),
          actor: hdr("From"),
          text: `${hdr("Subject")} — ${msg.snippet ?? ""}`.trim(),
          meta: { id },
        });
      }
      out.sort((a, b) => b.ts.localeCompare(a.ts));
      return out;
    } catch {
      return [];
    }
  },

  async write(verb, desc, dryRun) {
    // Real path would POST a draft to gmail/v1/users/me/drafts. Dry-run default.
    if (dryRun) return { tool: `gmail.${verb}`, ok: true, result: `dry-run · would gmail.${verb}: ${desc}` };
    return { tool: `gmail.${verb}`, ok: false, result: "live Gmail send disabled by default" };
  },
};
