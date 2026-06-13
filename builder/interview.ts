import type { LoopSpec } from "@/lib/types";

/**
 * INTERVIEWER AGENT (builder 1/3)
 * Opus 4.8 asks <=6 adaptive, NON-technical questions and emits a validated
 * LoopSpec. It never asks the user to write a prompt, pick a model, or name a
 * layer (acceptance criterion #7).
 */
export async function interview(
  workflowDescription: string,
  answers: Record<string, string> = {},
): Promise<{ nextQuestion?: string; spec?: LoopSpec }> {
  // TODO: call claude-opus-4-8 to drive the interview, infer sensors/tools from
  // the description, and fill the LoopSpec once enough is known.
  void workflowDescription;
  void answers;
  throw new Error("interview: model call not yet wired (see PLAN.md §5)");
}
