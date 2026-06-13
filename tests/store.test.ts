import { describe, it, expect, afterAll } from "vitest";
import type { Learning, RunRecord } from "@/lib/types";
import {
  saveRun,
  listRuns,
  appendMemory,
  loadMemory,
  saveSpec,
  loadSpec,
  listLoops,
  _resetLoop,
} from "@/lib/store";
import { GTM_LOOP } from "@/lib/spec";

const LOOP = "vitest-store";

function learning(id: string, ts: string): Learning {
  return { id, type: "preference", trigger: "when drafting", lesson: `lesson ${id}`, createdAt: ts };
}

function record(ts: string, score: number, priorLearningCount: number): RunRecord {
  return {
    ts,
    signals: [{ source: "gmail", ts, text: "hi" }],
    plan: { focus: "", reasoning: "x", moves: [] },
    outcomes: [],
    output: `# brief ${ts}`,
    gate: { score, pass: score >= 80, criteria: [], revisionHint: "" },
    learnings: [],
    priorLearningCount,
  };
}

afterAll(async () => {
  await _resetLoop(LOOP);
});

describe("store — durable runs (acceptance #4)", () => {
  it("persists a run and lists it back with the score", async () => {
    await _resetLoop(LOOP);
    const where = await saveRun(record("2026-06-13T10:00:00.000Z", 74, 0), LOOP, "manual");
    expect(where).toBeTruthy();
    const runs = await listRuns(LOOP);
    expect(runs).toHaveLength(1);
    expect(runs[0].score).toBe(74);
    expect(runs[0].trigger).toBe("manual");
  });

  it("returns run history oldest-first (the improvement-chart order)", async () => {
    await _resetLoop(LOOP);
    await saveRun(record("2026-06-13T10:00:00.000Z", 74, 0), LOOP);
    await saveRun(record("2026-06-13T11:00:00.000Z", 91, 1), LOOP, "scheduler");
    const runs = await listRuns(LOOP);
    expect(runs.map((r) => r.score)).toEqual([74, 91]);
    expect(runs[1].trigger).toBe("scheduler");
  });
});

describe("store — durable memory delta (acceptance #5)", () => {
  it("append → load round-trips learnings and grows the memory delta", async () => {
    await _resetLoop(LOOP);
    expect(await loadMemory(LOOP)).toHaveLength(0);

    await appendMemory([learning("a", "2026-06-13T10:00:00.000Z")], LOOP);
    const after1 = await loadMemory(LOOP);
    expect(after1).toHaveLength(1);
    expect(after1[0].lesson).toBe("lesson a");
    expect(after1[0].type).toBe("preference");

    await appendMemory([learning("b", "2026-06-13T11:00:00.000Z")], LOOP);
    const after2 = await loadMemory(LOOP);
    // non-empty delta between runs — the assertion the PLAN demands
    expect(after2.length).toBeGreaterThan(after1.length);
    expect(after2.map((l) => l.id)).toEqual(["a", "b"]); // oldest-first
  });
});

describe("store — saved specs for the scheduler (acceptance #6 prerequisite)", () => {
  it("saves and reloads a spec, and lists the loop id", async () => {
    await _resetLoop(LOOP);
    await saveSpec({ ...GTM_LOOP, name: LOOP }, LOOP);
    const back = await loadSpec(LOOP);
    expect(back?.name).toBe(LOOP);
    expect(back?.sensors).toEqual(GTM_LOOP.sensors);
    expect(await listLoops()).toContain(LOOP);
  });
});
