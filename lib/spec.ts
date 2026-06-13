import type { LoopSpec } from "@/lib/types";

/**
 * The default demo loop the builder would generate from a GTM interview.
 * In the full product this comes out of builder/interview.ts → architect.ts.
 */
export const GTM_LOOP: LoopSpec = {
  name: "Weekly GTM Execution Loop",
  description:
    "Turns Slack, customer calls, emails, and calendar into the few moves that matter — and drafts the outreach.",
  sensors: ["slack", "gmail", "fathom", "calendar"],
  cadence: "weekly:mon:08:00",
  decisionPolicy:
    "Surface only the 2-3 moves that actually move revenue this week. Lead with the hottest deal. Draft the outreach. Drop pure noise (logistics, FYIs).",
  outputFormat: "A scannable weekly brief: focus + ranked moves + ready-to-send actions.",
  rubric: [
    { name: "Clarity", weight: 20, description: "A non-technical reader knows exactly what to do." },
    { name: "Actionability", weight: 20, description: "Every move has a concrete next action and a tool to do it." },
    { name: "Signal selection", weight: 20, description: "The chosen items are the ones that matter; noise dropped." },
    { name: "Grounding", weight: 15, description: "Claims trace to real ingested signals, not invention." },
    { name: "Fit to operator", weight: 25, description: "Reflects this operator's learned preferences (format, thresholds, tone). Impossible to score high with no accumulated memory." },
  ],
};
