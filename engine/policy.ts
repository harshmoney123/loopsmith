import type { Signal, Learning, LoopSpec, Plan, Move } from "@/lib/types";

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

/**
 * Parse the streamed brief into the structured Plan the RunRecord schema
 * expects (focus + reasoning + moves), so record.json and any consumer get
 * real fields instead of a single reasoning blob. Forgiving: if a section is
 * missing, the corresponding field is empty rather than throwing.
 */
export function parsePlan(output: string): Plan {
  const focusMatch = output.match(/\*\*\s*Focus\s*:?\s*\*\*\s*(.+)/i) || output.match(/^##\s*Focus\s*\n+(.+)/im);
  const focus = focusMatch ? focusMatch[1].trim() : "";

  // Reasoning = text between the focus line and the "## Moves" heading.
  let reasoning = output;
  const movesIdx = output.search(/##\s*Moves/i);
  if (focusMatch) {
    const afterFocus = output.slice((focusMatch.index ?? 0) + focusMatch[0].length);
    reasoning = (movesIdx >= 0 ? afterFocus.slice(0, afterFocus.search(/##\s*Moves/i)) : afterFocus).trim();
  } else if (movesIdx >= 0) {
    reasoning = output.slice(0, movesIdx).trim();
  }

  const moves: Move[] = [];
  if (movesIdx >= 0) {
    const movesBlock = output.slice(movesIdx).replace(/##\s*Moves/i, "");
    const end = movesBlock.search(/##\s*Actions/i);
    const scope = end >= 0 ? movesBlock.slice(0, end) : movesBlock;
    // Split on numbered-item boundaries ("1. ", "2. ") to keep multi-line bodies.
    const items = scope.split(/^\s*\d+\.\s+/m).map((s) => s.trim()).filter(Boolean);
    for (const item of items) {
      const titleMatch = item.match(/^\*\*(.+?)\*\*\s*[—–-]?\s*([\s\S]*)$/);
      if (!titleMatch) continue;
      const title = titleMatch[1].trim();
      const body = titleMatch[2].trim();
      const toolMatch = body.match(/\[([a-z0-9_.]+)\]/i);
      const actionMatch = body.match(/_?Action:?_?\s*([\s\S]+?)(?:`?\[[a-z0-9_.]+\]`?|$)/i);
      const why = body.split(/_?Action:?_?/i)[0].replace(/[`*]/g, "").trim();
      moves.push({
        title,
        why: why || body.replace(/[`*]/g, "").slice(0, 140).trim(),
        action: actionMatch ? actionMatch[1].replace(/[`*]/g, "").trim() : "",
        tool: toolMatch ? toolMatch[1] : "",
      });
    }
  }

  return { focus, reasoning, moves };
}
