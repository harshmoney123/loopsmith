import type { Signal, ToolOutcome } from "@/lib/types";
import { env, envAny, type Connector } from "./types";

/**
 * Notion connector — reads recently-edited pages (search) and creates real task
 * rows (write). Activates with an integration token (NOTION_TOKEN / NOTION_API_KEY).
 * Writes are schema-aware: it discovers the database's title column, so it works
 * on ANY database, and drops the full detail into the page body.
 */
const V = "2022-06-28";

function headers() {
  return {
    Authorization: `Bearer ${envAny("NOTION_TOKEN", "NOTION_API_KEY")}`,
    "Notion-Version": V,
    "Content-Type": "application/json",
  };
}

// Cache the title-property name per database so we don't re-fetch each write.
const titlePropCache: Record<string, string> = {};

async function titleProp(db: string): Promise<string> {
  if (titlePropCache[db]) return titlePropCache[db];
  try {
    const meta = await fetch(`https://api.notion.com/v1/databases/${db}`, { headers: headers() }).then(
      (r) => r.json() as Promise<{ properties?: Record<string, { type: string }> }>,
    );
    const props = meta.properties || {};
    const name = Object.keys(props).find((k) => props[k].type === "title") || "Name";
    titlePropCache[db] = name;
    return name;
  } catch {
    return "Name";
  }
}

export const notion: Connector = {
  source: "notion",
  label: "Notion",
  note: "set NOTION_TOKEN (share the integration to your database)",

  configured() {
    return !!envAny("NOTION_TOKEN", "NOTION_API_KEY");
  },

  async read(limit) {
    if (!this.configured()) return [];
    try {
      const res = await fetch("https://api.notion.com/v1/search", {
        method: "POST",
        headers: headers(),
        body: JSON.stringify({
          sort: { direction: "descending", timestamp: "last_edited_time" },
          page_size: limit,
        }),
      }).then((r) => r.json() as Promise<{ results?: Record<string, unknown>[] }>);

      return (res.results || []).slice(0, limit).map((p) => {
        const title = titleOf(p);
        return {
          source: "notion",
          ts: (p.last_edited_time as string) || new Date().toISOString(),
          actor: title,
          text: `Updated in Notion: ${title}`,
          meta: { id: p.id },
        } as Signal;
      });
    } catch {
      return [];
    }
  },

  async write(verb, desc, dryRun): Promise<ToolOutcome> {
    const db = env("NOTION_TASKS_DB");
    if (dryRun || !db) {
      return { tool: `notion.${verb}`, ok: true, result: `dry-run · would notion.${verb}: ${desc}` };
    }
    try {
      const prop = await titleProp(db);
      // Concise title (first sentence / 90 chars), full detail in the body.
      const title = (desc.split(/[.!?]\s/)[0] || desc).slice(0, 90);
      const res = await fetch("https://api.notion.com/v1/pages", {
        method: "POST",
        headers: headers(),
        body: JSON.stringify({
          parent: { database_id: db },
          properties: { [prop]: { title: [{ text: { content: title } }] } },
          children: [
            { object: "block", type: "paragraph", paragraph: { rich_text: [{ text: { content: desc } }] } },
            {
              object: "block",
              type: "callout",
              callout: {
                icon: { emoji: "🔁" },
                rich_text: [{ text: { content: `Created by Loopsmith · ${new Date().toLocaleString()}` } }],
              },
            },
          ],
        }),
      });
      if (!res.ok) {
        const body = await res.text().catch(() => "");
        return { tool: `notion.${verb}`, ok: false, result: `notion error ${res.status}: ${body.slice(0, 120)}` };
      }
      return { tool: `notion.${verb}`, ok: true, result: `✓ created Notion task: ${title}` };
    } catch (e) {
      return { tool: `notion.${verb}`, ok: false, result: e instanceof Error ? e.message : "notion failed" };
    }
  },
};

function titleOf(page: Record<string, unknown>): string {
  const props = (page.properties as Record<string, Record<string, unknown>>) || {};
  for (const key of Object.keys(props)) {
    const p = props[key];
    if (p?.type === "title") {
      const arr = (p.title as { plain_text?: string }[]) || [];
      const t = arr.map((x) => x.plain_text ?? "").join("").trim();
      if (t) return t;
    }
  }
  return "Untitled";
}
