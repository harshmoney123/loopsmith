import { describe, it, expect } from "vitest";
import { parsePlan, policyPrompt } from "@/engine/policy";
import { GTM_LOOP } from "@/lib/spec";

describe("policy — humanEdit is applied to the current run (human-in-the-loop)", () => {
  const signals = [{ source: "gmail", ts: "t", text: "Acme deal $120k" }];

  it("injects operator feedback into the policy prompt when present", () => {
    const note = "Always lead with the exact dollar amount";
    const p = policyPrompt(signals, GTM_LOOP, [], note);
    expect(p.system).toContain(note);
    expect(p.system.toLowerCase()).toContain("apply it now");
  });

  it("omits the feedback section when there is none", () => {
    const p = policyPrompt(signals, GTM_LOOP, []);
    expect(p.system.toLowerCase()).not.toContain("apply it now");
  });
});

/**
 * parsePlan turns the streamed brief into the structured Plan the RunRecord
 * schema promises (focus + reasoning + moves). The swarm e2e found these fields
 * were always empty; this locks in that they're populated.
 */
const BRIEF = `**Focus:** Save the $120k Globex renewal before Friday — it's the largest dollar amount at risk.

Globex explicitly threatens to walk without a security addendum by Friday. Sam at Initech is a warm, ready-to-close pilot. Hooli is churning on activation.

## Moves
1. **Unblock Globex renewal** — $120k ARR walks Friday without a security addendum. _Action:_ Draft the security addendum cover email to Priya \`[gmail.draft]\`
2. **Close Initech pilot** — warm, ready to sign. _Action:_ Reply to Sam with the contract link \`[gmail.draft]\`
3. **Log Hooli churn** — recoverable signal. _Action:_ Create a CRM note on the churn reason \`[notion.create]\`

## Actions
- [gmail.draft] Draft security addendum email to Priya
- [gmail.draft] Reply to Sam with contract
- [notion.create] Log Hooli churn reason`;

describe("policy — parsePlan structures the brief (schema gap found by swarm e2e)", () => {
  const plan = parsePlan(BRIEF);

  it("extracts the focus line", () => {
    expect(plan.focus).toContain("Globex");
    expect(plan.focus).not.toContain("**");
  });

  it("captures reasoning between focus and moves", () => {
    expect(plan.reasoning).toContain("Initech");
    expect(plan.reasoning).not.toContain("## Moves");
  });

  it("parses each move into title / why / action / tool", () => {
    expect(plan.moves).toHaveLength(3);
    const m0 = plan.moves[0];
    expect(m0.title).toBe("Unblock Globex renewal");
    expect(m0.why.toLowerCase()).toContain("walks friday");
    expect(m0.action.toLowerCase()).toContain("security addendum");
    expect(m0.tool).toBe("gmail.draft");
    expect(plan.moves[2].tool).toBe("notion.create");
  });

  it("never throws on a malformed or empty brief", () => {
    expect(parsePlan("").moves).toEqual([]);
    expect(parsePlan("just some text with no structure").focus).toBe("");
    expect(() => parsePlan("## Moves\n1. no bold title here")).not.toThrow();
  });
});
