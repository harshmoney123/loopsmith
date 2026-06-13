import { NextResponse } from "next/server";
import { listLoops, loadSpec, listRuns, loadMemory } from "@/lib/store";

export const runtime = "nodejs";

/**
 * GET /api/loops → every saved loop with a summary, so a returning user sees
 * "my loops" and the value accrued over time (run count, last score, memory).
 * A loop is saved when a custom (built) loop runs; this is the dashboard source.
 */
export async function GET() {
  try {
    const ids = await listLoops();
    const loops = await Promise.all(
      ids.map(async (loopId) => {
        const [spec, runs, memory] = await Promise.all([
          loadSpec(loopId),
          listRuns(loopId),
          loadMemory(loopId),
        ]);
        const last = runs[runs.length - 1];
        return {
          loopId,
          name: spec?.name ?? loopId,
          description: spec?.description ?? "",
          cadence: spec?.cadence ?? "",
          sensors: spec?.sensors ?? [],
          spec,
          runCount: runs.length,
          schedulerRuns: runs.filter((r) => r.trigger === "scheduler").length,
          scores: runs.map((r) => r.score),
          lastScore: last?.score ?? null,
          lastRun: last?.ts ?? null,
          memoryCount: memory.length,
        };
      }),
    );
    // most recently run first
    loops.sort((a, b) => (b.lastRun ?? "").localeCompare(a.lastRun ?? ""));
    return NextResponse.json({ loops });
  } catch (err) {
    return NextResponse.json(
      { loops: [], error: err instanceof Error ? err.message : String(err) },
      { status: 200 },
    );
  }
}
