import { describe, it, expect } from "vitest";
import { parseRawContext } from "@/engine/sensor";

/**
 * Real-context ingestion: a non-technical user pastes their actual week and the
 * loop runs on that real data (no OAuth). The parse must be forgiving and
 * deterministic — any reasonable paste yields grounded signals.
 */
describe("sensor — parseRawContext (real value, no OAuth)", () => {
  it("returns nothing for empty input", () => {
    expect(parseRawContext("")).toEqual([]);
    expect(parseRawContext("   \n  ")).toEqual([]);
  });

  it("splits blank-line-separated blocks into signals", () => {
    const raw = "Acme wants to renew but is stalling on price.\n\nNew lead from a webinar attendee.\n\nTeam offsite logistics are sorted.";
    const sigs = parseRawContext(raw);
    expect(sigs).toHaveLength(3);
    expect(sigs[0].text).toContain("Acme");
  });

  it("infers source from leading markers and strips them", () => {
    const raw = [
      "[slack] Jordan: can we get the Q3 numbers before the board call?",
      "",
      "Email from jane@acme.com: ready to sign once we confirm SSO.",
      "",
      "Call with BetaCo — they churned, cited onboarding.",
      "",
      "Calendar: demo with Initech Thursday 2pm.",
    ].join("\n");
    const sigs = parseRawContext(raw);
    const sources = sigs.map((s) => s.source);
    expect(sources).toContain("slack");
    expect(sources).toContain("gmail");
    expect(sources).toContain("fathom");
    expect(sources).toContain("calendar");
    // marker text should be stripped from the body
    expect(sigs.find((s) => s.source === "slack")!.text.toLowerCase()).not.toContain("[slack]");
  });

  it("extracts an actor when present", () => {
    const sigs = parseRawContext("[slack] Jordan: can we get the Q3 numbers?");
    const s = sigs[0];
    expect(s.source).toBe("slack");
    expect(s.actor).toBe("Jordan");
    expect(s.text.toLowerCase()).toContain("q3 numbers");
  });

  it("falls back to per-line parsing for one unstructured block", () => {
    const raw = "renewal stalled at Acme\nnew webinar lead\noffsite booked";
    const sigs = parseRawContext(raw);
    expect(sigs.length).toBe(3);
  });

  it("handles --- rule separators and caps volume", () => {
    const big = Array.from({ length: 60 }, (_, i) => `signal number ${i} with detail`).join("\n---\n");
    const sigs = parseRawContext(big);
    expect(sigs.length).toBeLessThanOrEqual(40);
    expect(sigs[0].text).toContain("signal number 0");
  });

  it("defaults unmarked blocks to the 'note' source", () => {
    const sigs = parseRawContext("just a freeform thought about the roadmap this week");
    expect(sigs[0].source).toBe("note");
  });

  it("does NOT mistake leading verbs for source markers (#5 fix)", () => {
    // A sentence starting with a keyword-like verb must keep its full text and
    // stay 'note' — not get its first word stripped and mislabeled.
    const call = parseRawContext("Call Sarah about the renewal before Friday")[0];
    expect(call.source).toBe("note");
    expect(call.text.toLowerCase()).toContain("call sarah");

    const email = parseRawContext("Email the whole team the Q3 numbers")[0];
    expect(email.source).toBe("note");
    expect(email.text.toLowerCase()).toContain("email the whole team");

    // but genuine labeled forms still classify correctly
    expect(parseRawContext("Call with BetaCo — they churned")[0].source).toBe("fathom");
    expect(parseRawContext("Email from jane@acme.com: ready to sign")[0].source).toBe("gmail");
    expect(parseRawContext("[slack] ship it")[0].source).toBe("slack");
  });
});
