import { describe, it, expect, afterAll } from "vitest";
import { execFileSync } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { generateRepo } from "@/builder/codegen";
import { GTM_LOOP } from "@/lib/spec";

/**
 * Acceptance #3, for real: materialize the generated project to disk and run its
 * OWN test suite + health check with ZERO install and ZERO network. Proves the
 * artifact a user downloads actually works — not just that the file strings exist.
 */
const DIR = join(process.cwd(), ".codegen-test");

afterAll(() => rmSync(DIR, { recursive: true, force: true }));

describe("codegen — the generated repo actually runs (acceptance #3)", () => {
  it("npm test (node --test) passes on the materialized repo, and /health answers", () => {
    rmSync(DIR, { recursive: true, force: true });
    const files = generateRepo(GTM_LOOP);
    for (const f of files) {
      const p = join(DIR, f.path);
      mkdirSync(dirname(p), { recursive: true });
      writeFileSync(p, f.content);
    }

    // `node --test` — exits 0 only if every generated test passes (no install).
    const testOut = execFileSync("node", ["--test"], { cwd: DIR, encoding: "utf8", timeout: 15000 });
    expect(testOut).toMatch(/pass \d+/);
    expect(testOut).not.toMatch(/\nfail [1-9]/);

    // health check prints JSON and exits 0.
    const healthOut = execFileSync("node", ["health.mjs", "--once"], { cwd: DIR, encoding: "utf8", timeout: 10000 });
    const health = JSON.parse(healthOut.trim());
    expect(health.status).toBe("ok");
  });
});
