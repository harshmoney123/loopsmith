import type { LoopSpec } from "@/lib/types";

export interface DesignNode {
  layer: "sensor" | "policy" | "tools" | "gate" | "learning";
  label: string; // plain-English ("Listens to: Slack, Gmail")
  detail: string;
}

/**
 * ARCHITECT AGENT (builder 2/3)
 * Turns a LoopSpec into the named 5-layer design (rendered live as a React Flow
 * graph) and writes the gate rubric. No code yet — design first (PLAN.md §3 #2).
 */
export async function design(spec: LoopSpec): Promise<{ nodes: DesignNode[]; rubricMd: string }> {
  // TODO: call claude-opus-4-8 to map the spec onto the 5 layers and author
  // rubric.md from spec.rubric.
  void spec;
  throw new Error("architect.design: model call not yet wired (see PLAN.md §5)");
}
