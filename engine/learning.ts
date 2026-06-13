import type { Learning, LoopSpec } from "@/lib/types";

/**
 * LEARNING / MEMORY LAYER (4/5)
 * Opus 4.8 reflects on this run (signals → output → gate verdict + any human
 * edit) and writes durable lessons. The next run's policy reads them first,
 * closing the loop so each run gets better.
 */
export function learningPrompt(opts: {
  spec: LoopSpec;
  output: string;
  gateText: string;
  score: number;
  humanEdit?: string;
}): { system: string; user: string } {
  const system = [
    `You are the learning layer of a self-improving loop. Extract 1-2 DURABLE lessons that would make the NEXT run score higher and better match what the operator wants.`,
    `A good lesson is specific and reusable across runs — not a restatement of this run's content.`,
    ``,
    `Output ONLY lesson lines, each EXACTLY:`,
    `- [<type>] when <trigger> → <lesson>`,
    `type is one of: preference, correction, pattern, context.`,
    `No preamble, no other text.`,
  ].join("\n");

  const user = [
    `Gate score: ${opts.score}/100`,
    `Gate critique:\n${opts.gateText}`,
    opts.humanEdit ? `\nThe operator edited the output. Their edit / note:\n${opts.humanEdit}` : ``,
    `\nThe output that was produced:\n${opts.output}`,
    `\nWrite the lesson lines now.`,
  ].join("\n");

  return { system, user };
}

/** Parse "- [type] when <trigger> → <lesson>" lines into Learnings. */
export function parseLearnings(text: string, ts: string): Learning[] {
  const out: Learning[] = [];
  const re = /-\s*\[(preference|correction|pattern|context)\]\s*(?:when\s*)?(.+?)\s*(?:→|->)\s*(.+)/gi;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text)) !== null) {
    out.push({
      id: `${ts}-${i++}`,
      type: m[1].toLowerCase() as Learning["type"],
      trigger: m[2].trim(),
      lesson: m[3].trim(),
      createdAt: ts,
    });
  }
  return out;
}
