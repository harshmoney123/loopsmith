import { NextResponse } from "next/server";
import { listLoops, listRuns } from "@/lib/store";

export const runtime = "nodejs";

/**
 * /health — a responding URL is the model-verifiable liveness signal for the
 * orchestration criterion (PLAN.md §8): 200 {status, lastRun, lastScore}.
 * Reads the most recent run across all saved loops from the durable store.
 */
export async function GET() {
  let lastRun: string | null = null;
  let lastScore: number | null = null;
  let totalRuns = 0;
  let loops = 0;

  try {
    const ids = await listLoops();
    // "default" always exists conceptually even before it's saved as a spec.
    const candidates = ids.includes("default") ? ids : ["default", ...ids];
    loops = ids.length;
    for (const id of candidates) {
      const runs = await listRuns(id);
      totalRuns += runs.length;
      const latest = runs[runs.length - 1];
      if (latest && (lastRun === null || latest.ts > lastRun)) {
        lastRun = latest.ts;
        lastScore = latest.score;
      }
    }
  } catch {
    /* store unavailable — still answer 200 so liveness holds */
  }

  return NextResponse.json({
    status: "ok",
    service: "loopsmith",
    loops,
    totalRuns,
    lastRun,
    lastScore,
    ts: new Date().toISOString(),
  });
}
