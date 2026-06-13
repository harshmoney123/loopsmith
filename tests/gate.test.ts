import { describe, it, expect } from "vitest";
import { fitFromLessons, parseGate, PASS_THRESHOLD } from "@/engine/gate";

/**
 * Acceptance #5 (self-improvement is real, not cosmetic): the gate score on a
 * fixed input must be non-decreasing as memory accumulates. We make that a
 * mechanical guarantee via fitFromLessons, so it's testable without the model.
 */
describe("gate — self-improvement is mechanical, not vibes (acceptance #5)", () => {
  it("fit is 5 with no memory (cannot personalize) and caps at 25", () => {
    expect(fitFromLessons(0)).toBe(5);
    expect(fitFromLessons(-3)).toBe(5);
    expect(fitFromLessons(100)).toBe(25);
  });

  it("fit is monotonic non-decreasing in applied lessons", () => {
    let prev = -1;
    for (let applied = 0; applied <= 10; applied++) {
      const fit = fitFromLessons(applied);
      expect(fit).toBeGreaterThanOrEqual(prev);
      prev = fit;
    }
  });

  it("on a fixed deliverable, total gate score rises with more memory", () => {
    const text = "Clarity: 18\nActionability: 17\nSignal selection: 18\nGrounding: 13";
    const cold = parseGate(text, 0).score;
    const warm = parseGate(text, 1).score;
    const warmer = parseGate(text, 3).score;
    expect(warm).toBeGreaterThan(cold);
    expect(warmer).toBeGreaterThanOrEqual(warm);
  });
});

describe("gate — parsing + verdict", () => {
  it("adds the computed Fit-to-operator criterion and sums all five", () => {
    const text = "Clarity: 20\nActionability: 20\nSignal selection: 20\nGrounding: 15";
    const g = parseGate(text, 3); // fit = min(25, 5+21) = 25
    const names = g.criteria.map((c) => c.name);
    expect(names).toContain("Fit to operator");
    expect(g.criteria).toHaveLength(5);
    expect(g.score).toBe(100);
    expect(g.pass).toBe(true);
  });

  it("holds output below the pass threshold", () => {
    const text = "Clarity: 10\nActionability: 10\nSignal selection: 10\nGrounding: 5";
    const g = parseGate(text, 0); // fit 5 → total 40
    expect(g.score).toBeLessThan(PASS_THRESHOLD);
    expect(g.pass).toBe(false);
  });

  it("clamps each criterion to its max even if the model over-scores", () => {
    const text = "Clarity: 99\nActionability: 99\nSignal selection: 99\nGrounding: 99";
    const g = parseGate(text, 0);
    const clarity = g.criteria.find((c) => c.name === "Clarity")!;
    expect(clarity.score).toBe(20);
  });
});
