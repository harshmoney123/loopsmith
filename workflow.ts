import type { LoopSpec } from "@/lib/types";
import { interviewStep, type InterviewTurn, MAX_QUESTIONS } from "@/builder/interview";
import { designFromSpec } from "@/builder/architect";
import { generateRepo } from "@/builder/codegen";
import { runOnce } from "@/engine/loop";

/**
 * workflow.ts — the deterministic Loopsmith BUILD PIPELINE (PLAN.md §8, §11).
 *
 * This is the orchestration artifact: given a free-text workflow description, it
 * runs interview → architect → codegen → run → gate with a MODEL-VERIFIABLE EXIT
 * at every stage, so "done" is proven with NO human:
 *
 *   interview  → exit: loop-spec.json is schema-valid
 *   architect  → exit: all 5 layers present and non-empty
 *   codegen    → exit: runnable fileset incl. `npm test` = `node --test` + /health
 *   run        → exit: gate.json carries a numeric score (+ learnings written)
 *
 * Re-running this on a NEW description reproduces a NEW working loop — "another
 * team reruns it tomorrow." Consumed by /api/workflow (live) and a vitest test
 * (deterministic stages, CI-green).
 */

export interface StageResult {
  stage: string;
  ok: boolean;
  exit: string; // the verifiable exit condition that was (or wasn't) met
  detail?: string;
}

export interface WorkflowReport {
  description: string;
  spec: LoopSpec | null;
  stages: StageResult[];
  ok: boolean;
}

export interface WorkflowOpts {
  /** Skip the interview by supplying a spec directly (used by deterministic tests). */
  spec?: LoopSpec;
  /** Run the live loop (interview + run hit Opus). Default true. */
  runLoop?: boolean;
}

/** Acceptance #1 schema check — the interview's verifiable exit. */
export function validateSpec(spec: LoopSpec | null | undefined): string[] {
  const errs: string[] = [];
  if (!spec) return ["no spec produced"];
  if (!spec.name) errs.push("missing name");
  if (!spec.description) errs.push("missing description");
  if (!Array.isArray(spec.sensors) || spec.sensors.length === 0) errs.push("no sensors");
  if (!spec.cadence) errs.push("missing cadence");
  if (!spec.decisionPolicy) errs.push("missing decisionPolicy");
  if (!spec.outputFormat) errs.push("missing outputFormat");
  if (!Array.isArray(spec.rubric) || spec.rubric.length < 3) errs.push("rubric too small");
  const sum = (spec.rubric ?? []).reduce((s, c) => s + c.weight, 0);
  if (sum !== 100) errs.push(`rubric weights sum to ${sum}, expected 100`);
  if (!(spec.rubric ?? []).some((c) => c.name === "Fit to operator")) errs.push("rubric missing 'Fit to operator'");
  return errs;
}

const REQUIRED_FILES = ["package.json", "engine/loop.mjs", "tests/loop.test.mjs", "health.mjs", "rubric.md"];

export async function runWorkflow(description: string, opts: WorkflowOpts = {}): Promise<WorkflowReport> {
  const stages: StageResult[] = [];
  const push = (stage: string, ok: boolean, exit: string, detail?: string) => stages.push({ stage, ok, exit, detail });
  const report = (): WorkflowReport => ({ description, spec, stages, ok: stages.every((s) => s.ok) });

  // STAGE 1 — INTERVIEW → spec (auto-driven so the pipeline needs no human).
  let spec: LoopSpec | null = opts.spec ?? null;
  if (!spec) {
    const history: InterviewTurn[] = [];
    for (let i = 0; i <= MAX_QUESTIONS; i++) {
      const result = await interviewStep(description, history);
      if (result.done) {
        spec = result.spec;
        break;
      }
      // simulate the operator clicking the first suggested chip
      history.push({ prompt: result.question.prompt, answer: result.question.options[0] ?? "yes" });
    }
    const errs = validateSpec(spec);
    push("interview→spec", errs.length === 0, "loop-spec.json is schema-valid", errs.length ? errs.join("; ") : spec?.name);
    if (!spec) return report();
  } else {
    const errs = validateSpec(spec);
    push("interview→spec", errs.length === 0, "supplied spec is schema-valid", errs.length ? errs.join("; ") : spec.name);
    if (errs.length) return report();
  }

  // STAGE 2 — ARCHITECT → 5-layer design + rubric.
  const design = designFromSpec(spec);
  const layersOk = design.nodes.length === 5 && design.nodes.every((n) => n.detail.trim().length > 0);
  push("architect", layersOk, "all 5 layers present and non-empty", design.nodes.map((n) => n.layer).join("→"));

  // STAGE 3 — CODEGEN → runnable Claude Code project.
  const files = generateRepo(spec);
  const paths = new Set(files.map((f) => f.path));
  let pkg: { scripts?: Record<string, string> } = {};
  try {
    pkg = JSON.parse(files.find((f) => f.path === "package.json")?.content ?? "{}");
  } catch {
    /* invalid json → codegen fails below */
  }
  const codegenOk = REQUIRED_FILES.every((p) => paths.has(p)) && pkg.scripts?.test === "node --test";
  push("codegen", codegenOk, "runnable repo (npm test = node --test, /health present)", `${files.length} files`);

  // STAGE 4 — RUN → one full loop, gate scores it. (Hits Opus; skippable in CI.)
  if (opts.runLoop !== false) {
    try {
      const rec = await runOnce(spec, []);
      const runOk = typeof rec.gate.score === "number" && rec.gate.score >= 0;
      push("run→gate", runOk, "gate.json carries a numeric score", `scored ${rec.gate.score}/100, ${rec.learnings.length} learnings written`);
    } catch (err) {
      push("run→gate", false, "gate.json carries a numeric score", err instanceof Error ? err.message : String(err));
    }
  }

  return report();
}
