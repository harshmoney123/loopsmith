import { describe, it, expect } from "vitest";
import { fitFromLessons, parseGate, PASS_THRESHOLD } from "@/engine/gate";
import { GTM_LOOP } from "@/lib/spec";

const RUBRIC = GTM_LOOP.rubric;

describe("gate — Fit-to-operator (deterministic personalization signal)", () => {
  it("fit is 5 with no memory and caps at 25", () => {
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

  it("fit honors a custom Fit weight from the rubric", () => {
    expect(fitFromLessons(100, 30)).toBe(30);
    expect(fitFromLessons(0, 30)).toBe(5);
  });
});

describe("gate — score parser ignores critique-bullet numbers (#3 fix)", () => {
  it("reads the score from the anchored final line, not earlier bullets", () => {
    const text = [
      "- Clarity: 8 — the ask is buried under preamble.",
      "- Grounding: 5 — cites a deal not in the signals.",
      "",
      "Clarity: 16",
      "Actionability: 14",
      "Signal selection: 17",
      "Grounding: 12",
    ].join("\n");
    const g = parseGate(text, RUBRIC, 0);
    const get = (n: string) => g.criteria.find((c) => c.name === n)!.score;
    expect(get("Clarity")).toBe(16); // not 8 from the bullet
    expect(get("Grounding")).toBe(12); // not 5 from the bullet
  });

  it("falls back to a sane default when a score line is missing", () => {
    const text = "Clarity: 18\nActionability: 17"; // signal selection + grounding absent
    const g = parseGate(text, RUBRIC, 0);
    const sig = g.criteria.find((c) => c.name === "Signal selection")!;
    expect(sig.score).toBeGreaterThan(0); // 80% of weight, not 0
    expect(sig.score).toBeLessThanOrEqual(20);
  });
});

describe("gate — grades the loop's OWN rubric, not a fixed list (#7 fix)", () => {
  const customRubric = [
    { name: "Fit to operator", weight: 25, description: "x" },
    { name: "Emotion detection", weight: 25, description: "x" },
    { name: "Draft quality", weight: 25, description: "x" },
    { name: "Prioritization", weight: 15, description: "x" },
    { name: "Noise filtering", weight: 10, description: "x" },
  ];

  it("parses the custom criteria by name", () => {
    const text = "Emotion detection: 22\nDraft quality: 20\nPrioritization: 13\nNoise filtering: 8";
    const g = parseGate(text, customRubric, 0);
    const names = g.criteria.map((c) => c.name);
    expect(names).toContain("Emotion detection");
    expect(names).toContain("Noise filtering");
    expect(g.criteria.find((c) => c.name === "Emotion detection")!.score).toBe(22);
    // clamps to the custom weight
    const g2 = parseGate("Noise filtering: 99", customRubric, 0);
    expect(g2.criteria.find((c) => c.name === "Noise filtering")!.score).toBe(10);
  });

  it("always appends the computed Fit criterion", () => {
    const g = parseGate("Emotion detection: 20", customRubric, 3);
    expect(g.criteria.find((c) => c.name === "Fit to operator")!.score).toBe(25);
  });
});

describe("gate — verdict", () => {
  it("sums all five GTM criteria and passes a strong deliverable", () => {
    const text = "Clarity: 20\nActionability: 20\nSignal selection: 20\nGrounding: 15";
    const g = parseGate(text, RUBRIC, 3); // fit 25
    expect(g.criteria).toHaveLength(5);
    expect(g.score).toBe(100);
    expect(g.pass).toBe(true);
  });

  it("holds output below the pass threshold", () => {
    const text = "Clarity: 10\nActionability: 10\nSignal selection: 10\nGrounding: 5";
    const g = parseGate(text, RUBRIC, 0); // fit 5 → total 40
    expect(g.score).toBeLessThan(PASS_THRESHOLD);
    expect(g.pass).toBe(false);
  });

  it("more applied memory raises the total on a fixed judged text (Fit contribution)", () => {
    const text = "Clarity: 18\nActionability: 17\nSignal selection: 18\nGrounding: 13";
    expect(parseGate(text, RUBRIC, 1).score).toBeGreaterThan(parseGate(text, RUBRIC, 0).score);
  });
});
