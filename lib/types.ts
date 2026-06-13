/**
 * Loopsmith shared types — the contract between the 5 layers and the builder.
 * Dependency-free; imported by both the engine and the generated loops.
 */

/** A normalized signal emitted by the Sensor layer, regardless of source. */
export interface Signal {
  source: string; // "slack" | "gmail" | "fathom" | "calendar" | ...
  ts: string;
  actor?: string;
  text: string;
  meta?: Record<string, unknown>;
}

/** One thing that matters this run + the action to take on it. */
export interface Move {
  title: string;
  why: string; // why it matters, grounded in the signals
  action: string; // the concrete next action
  tool: string; // which tool would execute it (e.g. "gmail.draft")
}

/** The decision produced by the Business-logic / Policy layer. */
export interface Plan {
  focus: string; // the single most important theme this run
  reasoning: string; // why these moves, citing signals
  moves: Move[];
}

/** Result of the Tools layer executing the plan (dry-run by default). */
export interface ToolOutcome {
  tool: string;
  ok: boolean;
  result: string;
}

/** The Quality-gate verdict. */
export interface GateResult {
  score: number; // 0–100
  pass: boolean;
  criteria: { name: string; score: number; note: string }[];
  revisionHint: string;
}

/** A durable learning written by the Learning layer. */
export interface Learning {
  id: string;
  type: "preference" | "correction" | "pattern" | "context";
  trigger: string; // when this lesson applies
  lesson: string; // what to do
  createdAt: string;
}

/** One complete pass through the loop. */
export interface RunRecord {
  ts: string;
  signals: Signal[];
  plan: Plan;
  outcomes: ToolOutcome[];
  output: string; // markdown the user acts on
  gate: GateResult;
  learnings: Learning[]; // NEW learnings written this run
  priorLearningCount: number; // how many learnings fed this run's policy
}

/** The structured spec the Interviewer produces and the engine consumes. */
export interface LoopSpec {
  name: string;
  description: string;
  sensors: string[];
  cadence: string;
  decisionPolicy: string;
  outputFormat: string;
  rubric: { name: string; weight: number; description: string }[];
}
