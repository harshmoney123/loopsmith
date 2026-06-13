import type { Signal, Learning, LoopSpec } from "@/lib/types";

/**
 * BUSINESS-LOGIC / POLICY LAYER (2/5)
 * Opus 4.8 decides what matters this run and what to do about it. Prior
 * learnings are injected FIRST so the loop tightens over time — this is the
 * mechanism that makes each run better than the last.
 */
export function policyPrompt(
  signals: Signal[],
  spec: LoopSpec,
  learnings: Learning[],
): { system: string; user: string } {
  const system = [
    `You are the decision brain of "${spec.name}", a self-improving operating loop for a busy operator.`,
    `Decision policy: ${spec.decisionPolicy}`,
    ``,
    learnings.length
      ? `Apply these lessons from previous runs (they reflect what the operator actually wants):\n${learnings
          .map((l) => `- (${l.type}) when ${l.trigger} → ${l.lesson}`)
          .join("\n")}`
      : `This is the first run — no lessons yet.`,
    ``,
    `Write the deliverable as tight markdown in EXACTLY this shape:`,
    `**Focus:** <the single most important theme this run, one line>`,
    ``,
    `<2-3 sentences of reasoning that cite specific signals>`,
    ``,
    `## Moves`,
    `1. **<title>** — <why it matters>. _Action:_ <concrete next action> \`[tool]\``,
    `(2-3 moves, ranked by what matters most; drop the noise)`,
    ``,
    `## Actions`,
    `- [<tool>] <one-line action the tools layer will execute>`,
    `(one line per move, tool is e.g. gmail.draft, slack.send, notion.create, calendar.create)`,
    ``,
    `Lead with the hottest item. Be specific and grounded. No preamble.`,
  ].join("\n");

  const user = [
    `Signals ingested this run:`,
    ...signals.map(
      (s) => `- [${s.source}] ${s.actor ? s.actor + ": " : ""}${s.text}`,
    ),
    ``,
    `Produce the brief now.`,
  ].join("\n");

  return { system, user };
}
