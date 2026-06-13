import type { LoopSpec, RunRecord } from "@/lib/types";
import { ingest } from "./sensor";
import { recall, reflect } from "./learning";
import { decide } from "./policy";
import { act } from "./tools";
import { grade } from "./gate";

/**
 * THE LOOP — orchestrates all 5 layers for one run and persists runs/<ts>/.
 * sensor → (recall) → policy → tools → render → gate → learning
 *
 * This same orchestrator ships inside every generated loop, so the builder and
 * the build share one engine (PLAN.md §5).
 */
export async function runOnce(spec: LoopSpec): Promise<RunRecord> {
  const ts = new Date().toISOString();

  const signals = await ingest(spec.sensors);
  const learnings = await recall();
  const plan = await decide(signals, spec.decisionPolicy, learnings);
  await act(plan.toolCalls);

  // The output is the user-facing deliverable rendered from the plan.
  const output = renderOutput(plan, spec);

  const gate = await grade(output, spec.rubric);

  // Only reflect once the output has been graded — the score is a learning input.
  const newLearnings = await reflect(
    { ts, signals, plan, output, gate, learnings: [] },
  );

  return { ts, signals, plan, output, gate, learnings: newLearnings };
}

function renderOutput(plan: { focus: string }, spec: LoopSpec): string {
  return `# ${spec.name}\n\n**Focus this run:** ${plan.focus}\n`;
}
