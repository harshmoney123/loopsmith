import { describe, it, expect } from "vitest";
import { runWorkflow, validateSpec } from "@/workflow";
import { GTM_LOOP } from "@/lib/spec";

/**
 * The orchestration artifact (PLAN.md §8): every build stage has a
 * model-verifiable exit. We exercise the deterministic stages here (spec
 * supplied, run skipped) so the pipeline's verifiability is proven in CI with
 * no model/network. The live interview + run stages are exercised by
 * /api/workflow.
 */
describe("workflow — deterministic build pipeline with verifiable exits", () => {
  it("validateSpec catches malformed specs and passes good ones", () => {
    expect(validateSpec(GTM_LOOP)).toEqual([]);
    expect(validateSpec(null).length).toBeGreaterThan(0);
    expect(validateSpec({ ...GTM_LOOP, rubric: [] }).length).toBeGreaterThan(0);
  });

  it("runs spec→architect→codegen with each stage's exit met", async () => {
    const report = await runWorkflow("turn my week into the moves that matter", {
      spec: GTM_LOOP,
      runLoop: false, // skip the model-dependent run stage in CI
    });
    expect(report.ok).toBe(true);
    const byStage = Object.fromEntries(report.stages.map((s) => [s.stage, s]));
    expect(byStage["interview→spec"].ok).toBe(true);
    expect(byStage["architect"].ok).toBe(true);
    expect(byStage["codegen"].ok).toBe(true);
    // codegen's exit is the runnable-repo contract
    expect(byStage["codegen"].exit).toContain("node --test");
  });

  it("fails the pipeline (ok=false) when the spec is invalid", async () => {
    const report = await runWorkflow("bad", {
      spec: { ...GTM_LOOP, sensors: [], rubric: [] },
      runLoop: false,
    });
    expect(report.ok).toBe(false);
    expect(report.stages[0].ok).toBe(false);
  });
});
