import type { GateResult, LoopSpec } from "@/lib/types";

/**
 * QUALITY-GATE LAYER (3/5)
 * Opus 4.8 grades the four quality criteria; "Fit to operator" is computed
 * deterministically from accumulated memory. Rationale: fit-to-operator is, by
 * definition, a function of how much the loop has learned about this specific
 * operator — so we derive it from memory rather than ask the model to guess.
 * This also makes the self-improvement signal robust and reproducible: more
 * memory → higher Fit → higher total, run over run.
 */
export const PASS_THRESHOLD = 80;
const FIT_WEIGHT = 25;

/** Fit-to-operator points as a function of applied learned preferences. */
export function fitFromLessons(applied: number): number {
  if (applied <= 0) return 5; // no memory → cannot be personalized
  return Math.min(FIT_WEIGHT, 5 + applied * 7);
}

// The four LLM-judged criteria (weights sum to 75; Fit's 25 is computed).
const JUDGED = [
  { name: "Clarity", weight: 20 },
  { name: "Actionability", weight: 20 },
  { name: "Signal selection", weight: 20 },
  { name: "Grounding", weight: 15 },
];

export function gatePrompt(
  output: string,
  _rubric: LoopSpec["rubric"],
  _appliedLessons: number,
): { system: string; user: string } {
  const system = [
    `You are an exacting quality gate — a hard-to-impress editor, not a cheerleader.`,
    `Grade ONLY these four criteria (score each out of its max):`,
    ...JUDGED.map((c) => `- ${c.name} (max ${c.weight})`),
    ``,
    `Be strict: reward grounded, decluttered, immediately-sendable work; deduct for restatement, vague actions ("follow up"), or anything not traced to a signal.`,
    ``,
    `Write 2-3 short, specific critique bullets (quote the offending phrase), then output EXACTLY these four lines and nothing after:`,
    ...JUDGED.map((c) => `${c.name}: <0-${c.weight}>`),
  ].join("\n");

  const user = `Deliverable to grade:\n\n${output}`;
  return { system, user };
}

/** Parse the four judged scores, add deterministic Fit, return the verdict. */
export function parseGate(text: string, appliedLessons: number): GateResult {
  const criteria = JUDGED.map((c) => {
    const m = text.match(new RegExp(`${c.name}\\s*:?\\s*(\\d{1,3})`, "i"));
    const raw = m ? parseInt(m[1], 10) : Math.round(c.weight * 0.8);
    const score = Math.max(0, Math.min(c.weight, raw));
    return { name: c.name, score, note: "" };
  });

  const fit = fitFromLessons(appliedLessons);
  criteria.push({
    name: "Fit to operator",
    score: fit,
    note:
      appliedLessons <= 0
        ? "no accumulated memory yet — cannot personalize"
        : `${appliedLessons} learned preference(s) applied`,
  });

  const score = criteria.reduce((s, c) => s + c.score, 0);
  return {
    score,
    pass: score >= PASS_THRESHOLD,
    criteria,
    revisionHint: text,
  };
}
