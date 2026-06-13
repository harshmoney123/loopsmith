import type { LoopSpec, Learning, RunRecord } from "@/lib/types";
import { streamText } from "@/lib/anthropic";
import { ingest } from "./sensor";
import { policyPrompt } from "./policy";
import { parseActions, act } from "./tools";
import { gatePrompt, parseGate } from "./gate";
import { learningPrompt, parseLearnings } from "./learning";

/**
 * Non-streaming orchestration of all 5 layers for one run:
 * sensor → policy → tools → gate → learning. The API route has a streaming
 * variant for the live UI; this version is what the generated loop / tests use.
 */
export async function runOnce(
  spec: LoopSpec,
  priorLearnings: Learning[] = [],
): Promise<RunRecord> {
  const ts = new Date().toISOString();
  const noop = () => {};

  const signals = await ingest(spec.sensors);

  const p = policyPrompt(signals, spec, priorLearnings);
  const output = await streamText({ ...p, onToken: noop });

  const actions = parseActions(output);
  const outcomes = act(actions, true);

  const g = gatePrompt(output, spec.rubric, priorLearnings.length);
  const gateText = await streamText({ ...g, onToken: noop, maxTokens: 700 });
  const gate = parseGate(gateText, priorLearnings.length);

  const l = learningPrompt({ spec, output, gateText, score: gate.score });
  const learnText = await streamText({ ...l, onToken: noop, maxTokens: 500 });
  const learnings = parseLearnings(learnText, ts);

  return {
    ts,
    signals,
    plan: { focus: "", reasoning: output, moves: [] },
    outcomes,
    output,
    gate,
    learnings,
    priorLearningCount: priorLearnings.length,
  };
}
