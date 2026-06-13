import type { GateResult, LoopSpec } from "@/lib/types";

/**
 * QUALITY-GATE LAYER (3/5)
 *
 * Opus 4.8 grades the loop's OWN rubric criteria (so a builder-generated loop is
 * graded against the rubric it was given, not a fixed list). "Fit to operator"
 * is computed deterministically from the learned preferences applied to this
 * run's policy — by definition a function of how much the loop has learned about
 * this specific operator. The rest is LLM-judged.
 */
export const PASS_THRESHOLD = 80;
const DEFAULT_FIT_WEIGHT = 25;
const FIT_NAME = "Fit to operator";

/** The default judged criteria when a spec carries no rubric. */
const DEFAULT_JUDGED = [
  { name: "Clarity", weight: 20 },
  { name: "Actionability", weight: 20 },
  { name: "Signal selection", weight: 20 },
  { name: "Grounding", weight: 15 },
];

/** Fit-to-operator points as a function of applied learned preferences. */
export function fitFromLessons(applied: number, maxWeight = DEFAULT_FIT_WEIGHT): number {
  if (applied <= 0) return Math.min(5, maxWeight); // no memory → cannot personalize
  return Math.min(maxWeight, 5 + applied * 7);
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** The LLM-judged criteria for a spec = its rubric minus the computed Fit one. */
function judgedCriteria(rubric: LoopSpec["rubric"] | undefined): { name: string; weight: number }[] {
  const judged = (rubric ?? [])
    .filter((c) => c.name !== FIT_NAME)
    .map((c) => ({ name: c.name, weight: c.weight }));
  return judged.length ? judged : DEFAULT_JUDGED;
}

function fitWeightOf(rubric: LoopSpec["rubric"] | undefined): number {
  return rubric?.find((c) => c.name === FIT_NAME)?.weight ?? DEFAULT_FIT_WEIGHT;
}

export function gatePrompt(
  output: string,
  rubric: LoopSpec["rubric"],
  _appliedLessons: number,
): { system: string; user: string } {
  const judged = judgedCriteria(rubric);
  const system = [
    `You are an exacting quality gate — a hard-to-impress editor, not a cheerleader.`,
    `Grade ONLY these criteria (score each out of its max):`,
    ...judged.map((c) => `- ${c.name} (max ${c.weight})`),
    ``,
    `Be strict: reward grounded, decluttered, immediately-usable work; deduct for restatement, vague actions ("follow up"), or anything not traced to a signal.`,
    ``,
    `First write 2-3 short critique bullets (quote the offending phrase). THEN, on their own lines at the very end, output EXACTLY these ${judged.length} score line(s) and nothing after — each as "Name: <number>" with the number being the ONLY digits on that line:`,
    ...judged.map((c) => `${c.name}: <0-${c.weight}>`),
  ].join("\n");

  const user = `Deliverable to grade:\n\n${output}`;
  return { system, user };
}

/**
 * Parse the judged scores and add the deterministic Fit.
 *
 * #3 fix: the score for each criterion is read ONLY from a line that starts with
 * the criterion name followed by a colon and a number (anchored, multiline), and
 * we take the LAST such match — so numbers mentioned inside critique bullets
 * (e.g. "Clarity is weak, 9/20 at best") can't corrupt the load-bearing score.
 */
export function parseGate(
  text: string,
  rubric: LoopSpec["rubric"],
  appliedLessons: number,
): GateResult {
  const judged = judgedCriteria(rubric);
  const criteria = judged.map((c) => {
    const re = new RegExp(`^\\s*${escapeRegex(c.name)}\\s*:\\s*(\\d{1,3})`, "gim");
    let m: RegExpExecArray | null;
    let last: RegExpExecArray | null = null;
    while ((m = re.exec(text)) !== null) last = m;
    const raw = last ? parseInt(last[1], 10) : Math.round(c.weight * 0.8);
    const score = Math.max(0, Math.min(c.weight, raw));
    return { name: c.name, score, note: "" };
  });

  const fit = fitFromLessons(appliedLessons, fitWeightOf(rubric));
  criteria.push({
    name: FIT_NAME,
    score: fit,
    note:
      appliedLessons <= 0
        ? "no learned preferences yet — cannot personalize"
        : `${appliedLessons} learned preference(s) applied to this run's decision`,
  });

  const score = criteria.reduce((s, c) => s + c.score, 0);
  return {
    score,
    pass: score >= PASS_THRESHOLD,
    criteria,
    revisionHint: text,
  };
}
