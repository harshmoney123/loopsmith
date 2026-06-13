import type { LoopSpec } from "@/lib/types";
import { structured, type JsonSchema } from "@/lib/anthropic";

/**
 * INTERVIEWER AGENT (builder 1/3)
 * Opus 4.8 drives an adaptive, jargon-free interview (≤5 questions) and emits
 * either the next question or a finished LoopSpec. It never asks the user to
 * write a prompt, pick a model, or name a layer — only business questions.
 */

export type QuestionKind = "single" | "multi" | "text";

export interface InterviewQuestion {
  field: string; // which spec area this informs (internal)
  prompt: string; // the jargon-free question
  helper: string; // one-line helper / why it matters
  kind: QuestionKind;
  options: string[]; // suggested-reply chips (empty for free text)
}

export interface InterviewTurn {
  prompt: string;
  answer: string;
}

export interface InterviewResult {
  done: boolean;
  reply: string; // short conversational line shown to the user
  question: InterviewQuestion; // meaningful when !done
  spec: LoopSpec; // meaningful when done
}

export const MAX_QUESTIONS = 5;

const SCHEMA: JsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["done", "reply", "question", "spec"],
  properties: {
    done: { type: "boolean" },
    reply: { type: "string" },
    question: {
      type: "object",
      additionalProperties: false,
      required: ["field", "prompt", "helper", "kind", "options"],
      properties: {
        field: { type: "string" },
        prompt: { type: "string" },
        helper: { type: "string" },
        kind: { type: "string", enum: ["single", "multi", "text"] },
        options: { type: "array", items: { type: "string" } },
      },
    },
    spec: {
      type: "object",
      additionalProperties: false,
      required: ["name", "description", "sensors", "cadence", "decisionPolicy", "outputFormat", "rubric"],
      properties: {
        name: { type: "string" },
        description: { type: "string" },
        sensors: { type: "array", items: { type: "string" } },
        cadence: { type: "string" },
        decisionPolicy: { type: "string" },
        outputFormat: { type: "string" },
        rubric: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            required: ["name", "weight", "description"],
            properties: {
              name: { type: "string" },
              weight: { type: "integer" },
              description: { type: "string" },
            },
          },
        },
      },
    },
  },
};

export async function interviewStep(
  description: string,
  history: InterviewTurn[],
): Promise<InterviewResult> {
  const asked = history.length;
  const system = [
    `You are Loopsmith's interviewer. You help a NON-TECHNICAL leader design a self-improving "operating loop" — a workflow that runs itself: it pulls in signals, decides what matters, takes actions, checks its own quality, and learns over time.`,
    ``,
    `Your job: ask at most ${MAX_QUESTIONS} short, friendly, JARGON-FREE questions, ONE at a time, to learn enough to design their loop. Infer everything you can from what they've already said — only ask what you genuinely cannot infer. Offer suggested-reply options whenever possible so they can just click.`,
    ``,
    `Hard rules:`,
    `- NEVER ask them to write a prompt, pick an AI model, or name a technical "layer". Only business questions.`,
    `- One question per turn. Keep prompts under 18 words. Helper under 14 words.`,
    `- The five things you ultimately need (map their answers to these): (1) where the raw material lives [sensors], (2) how often it runs [cadence], (3) what makes something worth their attention vs noise [decisionPolicy], (4) what they want in their hands at the end [outputFormat], (5) whether it should draft-for-review or act on its own.`,
    `- ${asked} question(s) already answered. If you have enough to design a sensible loop (or after ${MAX_QUESTIONS} questions), set done=true and fill "spec" — make reasonable assumptions for anything unanswered. Otherwise set done=false and fill "question".`,
    ``,
    `When done, the spec:`,
    `- name: a short human title for the loop. description: one sentence.`,
    `- sensors: lowercase source keys from {slack, gmail, fathom, calendar, notion, drive, stripe} that fit their answer.`,
    `- cadence: like "weekly:mon:08:00" or "daily:09:00" or "on-demand".`,
    `- decisionPolicy: 1-2 sentences capturing what matters vs noise, in their domain.`,
    `- outputFormat: one line describing the deliverable.`,
    `- rubric: 4-5 criteria with integer weights summing to 100; ALWAYS include one named exactly "Fit to operator" (weight ~25) for personalization. The others are quality criteria for this domain.`,
    ``,
    `When NOT done, set done=false, put a one-line friendly "reply", and a "question" (leave spec fields as empty strings/arrays). When done, set done=true, put a one-line "reply" confirming, fill "spec" (leave question fields empty).`,
  ].join("\n");

  const user = [
    `The leader wants to automate this workflow:`,
    `"""${description}"""`,
    ``,
    history.length
      ? `Conversation so far:\n${history.map((h, i) => `Q${i + 1}: ${h.prompt}\nA${i + 1}: ${h.answer}`).join("\n")}`
      : `No questions asked yet.`,
    ``,
    `Produce the next interview step now.`,
  ].join("\n");

  const res = await structured<InterviewResult>({ system, user, schema: SCHEMA });

  // Safety: force completion if we've hit the cap.
  if (!res.done && asked >= MAX_QUESTIONS) res.done = true;
  return res;
}
