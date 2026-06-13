import { describe, it, expect } from "vitest";
import { generateRepo } from "@/builder/codegen";
import { GTM_LOOP } from "@/lib/spec";

/**
 * Acceptance #3: codegen produces a runnable Claude Code project — the artifact
 * the user keeps. We assert the structural contract here; the generated tests
 * run with `node --test` (zero install, zero network) which is verified
 * separately by materializing the fileset.
 */
describe("codegen — runnable generated repo (acceptance #3)", () => {
  const files = generateRepo(GTM_LOOP);
  const byPath = new Map(files.map((f) => [f.path, f.content]));

  it("emits the required runnable fileset", () => {
    const required = [
      "package.json",
      "CLAUDE.md",
      "rubric.md",
      "loop-spec.json",
      "engine/loop.mjs",
      "engine/gate.mjs",
      "engine/tools.mjs",
      "health.mjs",
      "tests/loop.test.mjs",
    ];
    for (const p of required) expect(byPath.has(p), `missing ${p}`).toBe(true);
  });

  it("package.json uses Node's built-in test runner (no install needed)", () => {
    const pkg = JSON.parse(byPath.get("package.json")!);
    expect(pkg.scripts.test).toBe("node --test");
    expect(pkg.scripts.loop).toBeTruthy();
    expect(pkg.scripts.health).toBeTruthy();
  });

  it("loop-spec.json round-trips the spec", () => {
    const spec = JSON.parse(byPath.get("loop-spec.json")!);
    expect(spec.name).toBe(GTM_LOOP.name);
    expect(spec.sensors).toEqual(GTM_LOOP.sensors);
  });

  it("the generated test imports the pure helpers it asserts", () => {
    const test = byPath.get("tests/loop.test.mjs")!;
    expect(test).toMatch(/gate\.mjs/);
    expect(test).toMatch(/node:test/);
  });

  it("every generated file is non-empty (except intentional .gitkeep markers)", () => {
    for (const f of files) {
      if (f.path.endsWith(".gitkeep")) continue;
      expect(f.content.length, `empty ${f.path}`).toBeGreaterThan(0);
    }
  });
});
