import type { ToolOutcome } from "@/lib/types";
import { dispatchAction } from "@/lib/connectors";

/**
 * TOOLS LAYER (5/5)
 * Executes the plan's actions. Dry-run by default (drafts, not sends); when a
 * run is `live` and the target connector is configured, the action really
 * happens — e.g. notion.create makes a real Notion task, gmail.draft a real
 * draft. See lib/connectors.
 */

/** Pull the "## Actions" lines ("- [tool] description") out of the brief. */
export function parseActions(brief: string): { tool: string; desc: string }[] {
  const out: { tool: string; desc: string }[] = [];
  // Tool tokens are dotted (e.g. gmail.draft) — requiring the dot avoids matching
  // markdown checkboxes like "[x]" or "[ ]" as a tool named "x".
  const re = /-\s*\[([a-z0-9_]+\.[a-z0-9_]+)\]\s*(.+)/gi;
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

/**
 * Live tools layer: dispatches each action to its real connector.
 * `live=false` (default) keeps everything dry-run; `live=true` performs real
 * side-effects for connectors that are configured (others stay dry-run).
 */
export async function actLive(
  actions: { tool: string; desc: string }[],
  live = false,
): Promise<ToolOutcome[]> {
  return Promise.all(actions.map((a) => dispatchAction(a.tool, a.desc, !live)));
}
