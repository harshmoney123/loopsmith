import type { ToolCall } from "@/lib/types";

/**
 * TOOLS LAYER (5/5)
 * Executes the Plan's tool calls via MCP write tools. Defaults to dry-run
 * (drafts, not sends) for demo safety; a visible toggle enables real actions.
 */
export async function act(
  toolCalls: ToolCall[],
): Promise<{ tool: string; ok: boolean; result: string }[]> {
  return Promise.all(
    toolCalls.map(async (call) => {
      const dryRun = call.dryRun ?? true;
      if (dryRun) {
        return { tool: call.tool, ok: true, result: `[dry-run] would call ${call.tool}` };
      }
      // TODO: dispatch to the matching MCP write tool.
      return { tool: call.tool, ok: false, result: "live tool dispatch not yet wired" };
    }),
  );
}
