import type { LoopSpec } from "@/lib/types";
import { GTM_LOOP } from "@/lib/spec";

/**
 * Ready-made loops for the #1 non-technical cold-start problem: the blank box.
 * A user who doesn't know what to type can click one and see value in one step —
 * straight to a finished spec, skip the interview, run it (on samples or their
 * own pasted week). Every preset is a full, schema-valid LoopSpec
 * (rubric weights sum to 100 and always include "Fit to operator").
 */

const FIT = { name: "Fit to operator", weight: 25, description: "Reflects this operator's learned preferences. Impossible to score high with no accumulated memory." };

export const SUPPORT_TRIAGE: LoopSpec = {
  name: "Morning Support Triage",
  description: "Each morning, surfaces the angriest / highest-risk customers from your inbox and drafts replies for you to approve.",
  sensors: ["gmail", "slack"],
  cadence: "daily:08:00",
  decisionPolicy:
    "Flag churn risk and genuine frustration first (outages, repeated issues, cancellation threats). Drop routine/FYI noise. Draft an empathetic reply for each flagged item.",
  outputFormat: "A ranked triage list of at-risk customers, each with a ready-to-send draft reply.",
  rubric: [
    FIT,
    { name: "Emotion detection", weight: 25, description: "Correctly identifies the angriest / highest-risk messages." },
    { name: "Draft quality", weight: 25, description: "Replies are empathetic, specific, and sendable as-is." },
    { name: "Prioritization", weight: 15, description: "The most urgent customer is on top." },
    { name: "Noise filtering", weight: 10, description: "Routine/FYI messages are dropped." },
  ],
};

export const DONOR_CARE: LoopSpec = {
  name: "Weekly Donor Care Loop",
  description: "Each week, reviews donor emails and grant deadlines and tells you who needs a personal thank-you or follow-up — and drafts them.",
  sensors: ["gmail", "calendar"],
  cadence: "weekly:mon:09:00",
  decisionPolicy:
    "Surface the highest-value donors and the nearest grant deadlines first. Draft personal, specific outreach. Treat logistics and newsletters as noise.",
  outputFormat: "A short brief: who to thank/follow up with this week + drafted personal emails, plus any grant deadline to hit.",
  rubric: [
    FIT,
    { name: "Relationship value", weight: 25, description: "Prioritizes the donors/deadlines that matter most." },
    { name: "Draft warmth", weight: 20, description: "Outreach feels personal and specific, not templated." },
    { name: "Deadline awareness", weight: 20, description: "Time-sensitive grant deadlines are surfaced." },
    { name: "Brevity", weight: 10, description: "Scannable; no filler." },
  ],
};

export const INBOX_ZERO: LoopSpec = {
  name: "Founder Inbox Triage",
  description: "Turns your overnight email + Slack into the handful of things that actually need you today — with drafts — so the rest can wait.",
  sensors: ["gmail", "slack", "calendar"],
  cadence: "daily:07:30",
  decisionPolicy:
    "Surface only what needs the founder personally today: revenue, investors, key hires, fires. Everything delegable or informational is noise. Draft the replies.",
  outputFormat: "A 'needs you today' shortlist with one-line why + a drafted reply for each.",
  rubric: [
    FIT,
    { name: "Triage accuracy", weight: 25, description: "Only genuinely founder-level items make the list." },
    { name: "Actionability", weight: 20, description: "Each item has a concrete next action / draft." },
    { name: "Grounding", weight: 20, description: "Every item traces to a real signal, no invention." },
    { name: "Brevity", weight: 10, description: "A 30-second read." },
  ],
};

/** The gallery, GTM first (the canonical demo). */
export const PRESET_LOOPS: LoopSpec[] = [GTM_LOOP, SUPPORT_TRIAGE, DONOR_CARE, INBOX_ZERO];
