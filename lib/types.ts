/**
 * Loopsmith shared types — the contract between the 5 layers and the builder.
 * Keep this file dependency-free; it is imported by both the engine and the generated loops.
 */

/** A normalized signal emitted by the Sensor layer, regardless of source. */
export interface Signal {
  source: string; // "slack" | "gmail" | "fathom" | "calendar" | ...
  ts: string; // ISO timestamp
  actor?: string; // who/what produced it
  text: string; // normalized content
  meta?: Record<string, unknown>;
}

/** A single action the Tools layer should execute. */
export interface ToolCall {
  tool: string; // "gmail.draft" | "slack.send" | "notion.create" | ...
  args: Record<string, unknown>;
  dryRun?: boolean; // default true for demo safety
}

/** The decision produced by the Business-logic / Policy layer. */
export interface Plan {
  focus: string; // what matters this run, in plain language
  reasoning: string; // why these signals were chosen
  toolCalls: ToolCall[];
}

/** The Quality-gate verdict. */
export interface GateResult {
  score: number; // 0–100
  pass: boolean; // score >= rubric threshold
  criteria: { name: string; score: number; note: string }[];
  revisionHint?: string; // what to fix if it failed
}

/** A durable learning written by the Learning layer. */
export interface Learning {
  id: string;
  type: "preference" | "correction" | "pattern" | "context";
  trigger: string; // when this lesson applies
  lesson: string; // what to do
  createdAt: string;
}

/** One complete pass through the loop, persisted to runs/<ts>/. */
export interface RunRecord {
  ts: string;
  signals: Signal[];
  plan: Plan;
  output: string; // markdown the user acts on
  gate: GateResult;
  learnings: Learning[];
}

/** The structured spec the Interviewer produces and the Architect/Codegen consume. */
export interface LoopSpec {
  name: string;
  description: string;
  sensors: string[]; // chosen MCP sources
  cadence: string; // e.g. "weekly:mon:08:00"
  decisionPolicy: string; // plain-English policy the user agreed to
  tools: string[]; // chosen MCP write tools
  outputFormat: string; // what the deliverable looks like
  rubric: { name: string; weight: number; description: string }[];
  memoryKeys: string[]; // what kinds of learnings to track
}
