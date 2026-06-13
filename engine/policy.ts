import type { Signal, Plan, Learning } from "@/lib/types";

/**
 * BUSINESS-LOGIC / POLICY LAYER (2/5)
 * Opus 4.8 decides what matters this run and which tools to call, with the
 * current learnings injected first so the loop tightens over time.
 */
export async function decide(
  signals: Signal[],
  decisionPolicy: string,
  learnings: Learning[],
): Promise<Plan> {
  // TODO: call Anthropic (claude-opus-4-8) with signals + policy + learnings.
  // The learnings MUST be injected before the signals so prior lessons bias
  // the decision — this is the mechanism that makes the loop self-improving.
  void signals;
  void decisionPolicy;
  void learnings;
  throw new Error("policy.decide: model call not yet wired (see PLAN.md §5)");
}
