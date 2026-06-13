import type { LoopSpec } from "@/lib/types";

/**
 * ARCHITECT AGENT (builder 2/3)
 * Turns a LoopSpec into the named 5-layer design — in plain English — for the
 * architecture reveal. Deterministic: instant and reproducible, no model call.
 */

export interface DesignNode {
  layer: "sensor" | "policy" | "tools" | "gate" | "learning";
  title: string; // plain-English ("Listens to")
  detail: string; // filled from the spec
}

const SENSOR_LABELS: Record<string, string> = {
  slack: "Slack",
  gmail: "Gmail",
  fathom: "calls (Fathom)",
  calendar: "Calendar",
  notion: "Notion",
  drive: "Drive",
  stripe: "Stripe",
};

function prettySensors(sensors: string[]): string {
  const names = sensors.map((s) => SENSOR_LABELS[s] ?? s);
  return names.length ? names.join(", ") : "your connected tools";
}

function prettyCadence(cadence: string): string {
  if (cadence.startsWith("weekly")) return "every week";
  if (cadence.startsWith("daily")) return "every day";
  if (cadence.startsWith("on-demand")) return "whenever you ask";
  return cadence;
}

export function designFromSpec(spec: LoopSpec): { nodes: DesignNode[]; rubricMd: string } {
  const nodes: DesignNode[] = [
    {
      layer: "sensor",
      title: "Listens to",
      detail: `${prettySensors(spec.sensors)} — pulled ${prettyCadence(spec.cadence)}.`,
    },
    {
      layer: "policy",
      title: "Decides what matters",
      detail: spec.decisionPolicy,
    },
    {
      layer: "tools",
      title: "Takes action",
      detail: `Produces: ${spec.outputFormat} (drafts for your review by default).`,
    },
    {
      layer: "gate",
      title: "Checks itself",
      detail: `Grades every result against ${spec.rubric.length} standards before it ships; holds weak output.`,
    },
    {
      layer: "learning",
      title: "Learns your taste",
      detail: `Writes back what it learned each run, so the next one fits you better.`,
    },
  ];

  const rubricMd = [
    `# Quality bar — ${spec.name}`,
    ``,
    `The gate ships a result only when it scores ≥ 80 / 100 against:`,
    ``,
    ...spec.rubric.map((r) => `- **${r.name}** (${r.weight}) — ${r.description}`),
  ].join("\n");

  return { nodes, rubricMd };
}
