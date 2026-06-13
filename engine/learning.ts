import type { Learning, RunRecord } from "@/lib/types";

/**
 * LEARNING / MEMORY LAYER (4/5)
 * Opus 4.8 reflects on (input, output, gate score, human edits) and writes
 * durable, queryable learnings to memory/. The next run's policy reads these
 * first — closing the loop so each run gets better.
 */
export async function reflect(run: RunRecord, humanEdits?: string): Promise<Learning[]> {
  // TODO: call claude-opus-4-8 to extract durable lessons, then persist to
  // memory/*.md (frontmatter: type/trigger/lesson) + FTS index.
  void run;
  void humanEdits;
  throw new Error("learning.reflect: model call not yet wired (see PLAN.md §4)");
}

/** Load all durable learnings for injection into the policy layer. */
export async function recall(): Promise<Learning[]> {
  // TODO: read memory/*.md (+ index). Empty on first run.
  return [];
}
