import { NextResponse } from "next/server";
import { listRuns, loadMemory } from "@/lib/store";

export const runtime = "nodejs";

/**
 * GET /api/runs?loopId=default → the durable run history + memory count for a
 * loop. This is the source for the improvement chart and the proof of
 * self-improvement over time (PLAN.md acceptance #5) and scheduler firing (#6).
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const loopId = url.searchParams.get("loopId") || "default";
  try {
    const runs = await listRuns(loopId);
    const memory = await loadMemory(loopId);
    return NextResponse.json({
      loopId,
      runs,
      memoryCount: memory.length,
      schedulerRuns: runs.filter((r) => r.trigger === "scheduler").length,
    });
  } catch (err) {
    return NextResponse.json(
      { loopId, runs: [], memoryCount: 0, error: err instanceof Error ? err.message : String(err) },
      { status: 200 },
    );
  }
}
