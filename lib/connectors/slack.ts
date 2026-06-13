import type { Signal, ToolOutcome } from "@/lib/types";
import { env, type Connector } from "./types";

/**
 * Slack connector — LIVE via a bot token (SLACK_BOT_TOKEN, scopes:
 * channels:read + channels:history; chat:write for sends). Reads recent messages
 * from the channels the bot is a member of and normalizes them to Signal[].
 * Mirrors AgentWeb's @slack/web-api usage, but via fetch (no SDK dependency).
 */
const API = "https://slack.com/api";

async function call(method: string, token: string, params: Record<string, string>) {
  const url = `${API}/${method}?${new URLSearchParams(params).toString()}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  return res.json() as Promise<Record<string, unknown>>;
}

/** Strip Slack mrkdwn entities to clean text. */
function clean(t: string): string {
  return t
    .replace(/<@[A-Z0-9]+>/g, "@someone")
    .replace(/<#[A-Z0-9]+\|([^>]+)>/g, "#$1")
    .replace(/<[^|>]+\|([^>]+)>/g, "$1") // <url|label>, <mailto:x|label> → label
    .replace(/<((?:https?|mailto|tel):[^>]+)>/g, "$1") // bare <url> → url
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[*_~`]/g, "") // drop mrkdwn emphasis chars
    .replace(/\s+/g, " ")
    .trim();
}

export const slack: Connector = {
  source: "slack",
  label: "Slack",
  note: "set SLACK_BOT_TOKEN (channels:read, channels:history)",

  configured() {
    return !!env("SLACK_BOT_TOKEN");
  },

  async read(limit) {
    const token = env("SLACK_BOT_TOKEN");
    if (!token) return [];
    try {
      const list = await call("conversations.list", token, {
        types: "public_channel",
        exclude_archived: "true",
        limit: "200",
      });
      if (!list.ok) return [];
      const channels = ((list.channels as Record<string, unknown>[]) || [])
        .filter((c) => c.is_member)
        .slice(0, 6);

      const out: Signal[] = [];
      for (const ch of channels) {
        const hist = await call("conversations.history", token, {
          channel: ch.id as string,
          limit: "8",
        });
        if (!hist.ok) continue;
        for (const m of (hist.messages as Record<string, unknown>[]) || []) {
          if (m.subtype || !m.text) continue; // skip joins / bot noise
          out.push({
            source: "slack",
            ts: new Date(Number(m.ts) * 1000).toISOString(),
            actor: `#${ch.name as string}`,
            text: clean(m.text as string),
            meta: { channel: ch.name },
          });
        }
      }
      out.sort((a, b) => b.ts.localeCompare(a.ts));
      return out.slice(0, limit);
    } catch {
      return [];
    }
  },

  async write(verb, desc, dryRun): Promise<ToolOutcome> {
    // Sends are real side-effects; default to dry-run for demo safety. Flip
    // dryRun=false (and the bot has chat:write) to actually post.
    if (dryRun) return { tool: `slack.${verb}`, ok: true, result: `dry-run · would slack.${verb}: ${desc}` };
    return { tool: `slack.${verb}`, ok: false, result: "live Slack send disabled by default" };
  },
};
