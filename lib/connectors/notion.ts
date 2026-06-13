import type { Signal, ToolOutcome } from "@/lib/types";
import { env, envAny, type Connector } from "./types";

/**
 * Notion connector — reads recently-edited pages (search) and can create a task
 * page (write). Activates with an integration token (NOTION_TOKEN / NOTION_API_KEY).
 */
const V = "2022-06-28";

function headers() {
  return {
    Authorization: `Bearer ${envAny("NOTION_TOKEN", "NOTION_API_KEY")}`,
    "Notion-Version": V,
    "Content-Type": "application/json",
  };
}

export const notion: Connector = {
  source: "notion",
  label: "Notion",
  note: "set NOTION_TOKEN (integration must be shared to the workspace)",

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
      const res = await fetch("https://api.notion.com/v1/pages", {
        method: "POST",
        headers: headers(),
        body: JSON.stringify({
          parent: { database_id: db },
          properties: { Name: { title: [{ text: { content: desc.slice(0, 200) } }] } },
        }),
      });
      return res.ok
        ? { tool: `notion.${verb}`, ok: true, result: `created Notion task: ${desc.slice(0, 80)}` }
        : { tool: `notion.${verb}`, ok: false, result: `notion error ${res.status}` };
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
