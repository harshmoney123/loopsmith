import { NextResponse } from "next/server";

/**
 * /health — a responding URL is the model-verifiable liveness signal for the
 * orchestration criterion (PLAN.md §8). Returns the last run's score when known.
 */
export async function GET() {
  return NextResponse.json({
    status: "ok",
    service: "loopsmith",
    lastRun: null,
    lastScore: null,
    ts: new Date().toISOString(),
  });
}
