import type { LoopSpec, Learning, RunRecord } from "@/lib/types";
import { streamText } from "@/lib/anthropic";
import { ingest } from "./sensor";
import { policyPrompt, parsePlan } from "./policy";
import { parseActions, act } from "./tools";
import { gatePrompt, parseGate } from "./gate";
import { learningPrompt, parseLearnings } from "./learning";
import { loadMemory, appendMemory, saveRun } from "@/lib/store";

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
    plan: parsePlan(output),
    outcomes,
    output,
    gate,
    learnings,
    priorLearningCount: priorLearnings.length,
  };
}

/**
 * Durable run: loads this loop's accumulated memory from the store, runs once,
 * then persists the run artifacts + the new learnings. This is what makes
 * self-improvement real across sessions and lets the scheduler fire with no
 * human present (PLAN.md acceptance #5, #6). Returns the record + where it saved.
 */
export async function runPersisted(
  spec: LoopSpec,
  loopId = "default",
  trigger: "manual" | "scheduler" = "manual",
): Promise<{ record: RunRecord; savedTo: string }> {
  const prior = await loadMemory(loopId);
  const record = await runOnce(spec, prior);
  const savedTo = await saveRun(record, loopId, trigger);
  await appendMemory(record.learnings, loopId);
  return { record, savedTo };
}
