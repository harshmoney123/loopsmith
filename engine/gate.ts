import type { GateResult, LoopSpec } from "@/lib/types";

/**
 * QUALITY-GATE LAYER (3/5)
 * Opus 4.8 acts as an LLM judge, grading the output against the loop's rubric
 * BEFORE it ships. Below threshold → revise & retry (bounded) or hold for a
 * human. This is what stops weak output from going out — the demo's "model
 * catches its own failure" moment (PLAN.md §9).
 */
const PASS_THRESHOLD = 80;

export async function grade(
  output: string,
  rubric: LoopSpec["rubric"],
): Promise<GateResult> {
  // TODO: call claude-opus-4-8 with the output + rubric.md criteria, return a
  // scored, per-criterion verdict. Threshold is the ship/hold line.
  void output;
  void rubric;
  void PASS_THRESHOLD;
  throw new Error("gate.grade: judge call not yet wired (see PLAN.md §4)");
}
