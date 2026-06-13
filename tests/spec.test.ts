import { describe, it, expect } from "vitest";
import { GTM_LOOP } from "@/lib/spec";
import type { LoopSpec } from "@/lib/types";

/**
 * Acceptance #1: a loop spec is well-formed — sensors, cadence, decision policy,
 * output format, and a gate rubric. This validates the shape every interview
 * must emit and every generated loop consumes.
 */
function validate(spec: LoopSpec): string[] {
  const errs: string[] = [];
  if (!spec.name) errs.push("missing name");
  if (!spec.description) errs.push("missing description");
  if (!Array.isArray(spec.sensors) || spec.sensors.length === 0) errs.push("no sensors");
  if (!spec.cadence) errs.push("missing cadence");
  if (!spec.decisionPolicy) errs.push("missing decisionPolicy");
  if (!spec.outputFormat) errs.push("missing outputFormat");
  if (!Array.isArray(spec.rubric) || spec.rubric.length < 3) errs.push("rubric too small");
  const sum = (spec.rubric ?? []).reduce((s, c) => s + c.weight, 0);
  if (sum !== 100) errs.push(`rubric weights sum to ${sum}, expected 100`);
  if (!(spec.rubric ?? []).some((c) => c.name === "Fit to operator"))
    errs.push("rubric missing 'Fit to operator' (the personalization criterion)");
  return errs;
}

describe("spec — schema validity (acceptance #1)", () => {
  it("the default GTM loop validates", () => {
    expect(validate(GTM_LOOP)).toEqual([]);
  });

  it("the validator catches a malformed spec", () => {
    const bad = { ...GTM_LOOP, sensors: [], rubric: [] } as LoopSpec;
    expect(validate(bad).length).toBeGreaterThan(0);
  });
});
