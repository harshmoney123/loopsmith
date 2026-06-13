import type { LoopSpec } from "@/lib/types";

/**
 * The default demo loop the builder would generate from a fundraise interview.
 * In the full product this comes out of builder/interview.ts → architect.ts.
 * Works for both sides of the table: a founder running a raise, or a VC
 * running deal-flow — same loop over investor emails, intros, and call notes.
 */
export const GTM_LOOP: LoopSpec = {
  name: "Fundraise Pipeline Loop",
  description:
    "Turns investor emails, intros, and call notes into the few relationships to move on this week — and drafts the follow-ups.",
  sensors: ["slack", "gmail", "fathom", "calendar"],
  cadence: "weekly:mon:08:00",
  decisionPolicy:
    "Surface only the 2-3 fundraising relationships that actually move the round forward this week. Lead with the hottest intro. Flag anyone who has gone quiet. Draft the follow-ups. Drop cold/low-intent notes and pure logistics.",
  outputFormat: "A scannable pipeline brief: focus + ranked moves + ready-to-send follow-ups.",
  rubric: [
    { name: "Clarity", weight: 20, description: "A non-technical reader knows exactly what to do." },
    { name: "Actionability", weight: 20, description: "Every move has a concrete next action and a tool to do it." },
    { name: "Signal selection", weight: 20, description: "The chosen items are the ones that matter; noise dropped." },
    { name: "Grounding", weight: 15, description: "Claims trace to real ingested signals, not invention." },
    { name: "Fit to operator", weight: 25, description: "Reflects this operator's learned preferences (format, thresholds, tone). Impossible to score high with no accumulated memory." },
  ],
};
