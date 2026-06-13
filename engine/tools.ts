import type { ToolOutcome } from "@/lib/types";

/**
 * TOOLS LAYER (5/5)
 * Executes the plan's actions. Defaults to dry-run (drafts, not sends) for demo
 * safety — a visible toggle would flip to real MCP write calls (gmail.draft,
 * slack.send, notion.create, …).
 */

/** Pull the "## Actions" lines ("- [tool] description") out of the brief. */
export function parseActions(brief: string): { tool: string; desc: string }[] {
  const out: { tool: string; desc: string }[] = [];
  const re = /-\s*\[([a-z0-9_.]+)\]\s*(.+)/gi;
  // only scan after an "## Actions" heading if present
  const idx = brief.search(/##\s*Actions/i);
  const scope = idx >= 0 ? brief.slice(idx) : brief;
  let m: RegExpExecArray | null;
  while ((m = re.exec(scope)) !== null) {
    out.push({ tool: m[1].trim(), desc: m[2].trim() });
  }
  return out;
}

export function act(
  actions: { tool: string; desc: string }[],
  dryRun = true,
): ToolOutcome[] {
  return actions.map((a) => ({
    tool: a.tool,
    ok: true,
    result: dryRun ? `dry-run · would ${a.tool}: ${a.desc}` : `executed ${a.tool}`,
  }));
}
