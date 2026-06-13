import { describe, it, expect } from "vitest";
import { designFromSpec } from "@/builder/architect";
import { GTM_LOOP } from "@/lib/spec";

/**
 * Acceptance #2: from the spec, the architect produces a named 5-layer design
 * with every layer present and non-empty, plus a rubric.
 */
describe("architect — 5-layer design (acceptance #2)", () => {
  const { nodes, rubricMd } = designFromSpec(GTM_LOOP);

  it("produces exactly the five named layers, in order", () => {
    expect(nodes.map((n) => n.layer)).toEqual(["sensor", "policy", "tools", "gate", "learning"]);
  });

  it("every layer has a plain-English title and a non-empty detail", () => {
    for (const n of nodes) {
      expect(n.title.length).toBeGreaterThan(0);
      expect(n.detail.trim().length).toBeGreaterThan(0);
    }
  });

  it("the sensor layer names the spec's sensors and cadence", () => {
    const sensor = nodes.find((n) => n.layer === "sensor")!;
    expect(sensor.detail.toLowerCase()).toContain("gmail");
    expect(sensor.detail.toLowerCase()).toContain("every week");
  });

  it("rubric markdown lists every criterion from the spec", () => {
    for (const c of GTM_LOOP.rubric) {
      expect(rubricMd).toContain(c.name);
    }
  });
});
