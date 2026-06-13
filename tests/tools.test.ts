import { describe, it, expect } from "vitest";
import { parseActions, act } from "@/engine/tools";

describe("tools — action extraction + dry-run execution (acceptance #4)", () => {
  const brief = [
    "## Focus",
    "Close the Acme deal.",
    "## Actions",
    "- [gmail.draft] Draft renewal email to jane@acme.com",
    "- [notion.create] Log the deal in CRM",
  ].join("\n");

  it("pulls tool + description only from the Actions section", () => {
    const actions = parseActions(brief);
    expect(actions).toHaveLength(2);
    expect(actions[0].tool).toBe("gmail.draft");
    expect(actions[0].desc).toContain("jane@acme.com");
    expect(actions[1].tool).toBe("notion.create");
  });

  it("does not pick up tool-looking text before the Actions heading", () => {
    const noisy = "- [should.ignore] this is above Actions\n" + brief;
    const actions = parseActions(noisy);
    expect(actions.map((a) => a.tool)).not.toContain("should.ignore");
  });

  it("defaults to dry-run (drafts, not sends) for demo safety", () => {
    const outcomes = act(parseActions(brief), true);
    expect(outcomes).toHaveLength(2);
    expect(outcomes.every((o) => o.ok)).toBe(true);
    expect(outcomes[0].result).toMatch(/^dry-run/);
  });

  it("does not treat markdown checkboxes as tools (#16 fix)", () => {
    const withCheckboxes = [
      "## Actions",
      "- [ ] not a tool, just a checkbox",
      "- [x] done item",
      "- [gmail.draft] this IS a tool",
    ].join("\n");
    const actions = parseActions(withCheckboxes);
    expect(actions.map((a) => a.tool)).toEqual(["gmail.draft"]);
  });
});
