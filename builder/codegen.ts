import type { LoopSpec } from "@/lib/types";

/**
 * CODEGEN AGENT (builder 3/3)
 * Emits a runnable Claude Code repo from the design. Strategy (PLAN.md §13):
 * a fixed, tested scaffold in templates/generated-loop/, where Opus only fills
 * 3 slots — the policy prompt, the rubric, and the tool list. Codegen = template
 * + fill, NOT from-scratch generation. Output passes `npm test` + answers /health.
 */
export async function generateRepo(
  spec: LoopSpec,
): Promise<{ files: { path: string; content: string }[] }> {
  // TODO: load templates/generated-loop, interpolate spec into the 3 slots,
  // return the file set for download/deploy.
  void spec;
  throw new Error("codegen.generateRepo: not yet wired (see PLAN.md §5)");
}
