import { describe, it, expect } from "vitest";
import { PRESET_LOOPS } from "@/lib/presets";
import { validateSpec } from "@/workflow";

/**
 * Prebuilt loops let a non-technical user skip the interview and run in one
 * click — so each must be a fully valid spec the engine can run unchanged.
 */
describe("presets — every ready-made loop is schema-valid", () => {
  it("has at least 3 presets", () => {
    expect(PRESET_LOOPS.length).toBeGreaterThanOrEqual(3);
  });

  for (const p of PRESET_LOOPS) {
    it(`"${p.name}" validates (rubric sums to 100, has Fit to operator)`, () => {
      expect(validateSpec(p)).toEqual([]);
      expect(p.rubric.some((c) => c.name === "Fit to operator")).toBe(true);
      expect(p.rubric.reduce((s, c) => s + c.weight, 0)).toBe(100);
      expect(p.sensors.length).toBeGreaterThan(0);
    });
  }

  it("preset names are unique", () => {
    const names = PRESET_LOOPS.map((p) => p.name);
    expect(new Set(names).size).toBe(names.length);
  });
});
