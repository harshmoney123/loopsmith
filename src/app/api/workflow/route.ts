import { NextResponse } from "next/server";
import { runWorkflow } from "@/workflow";

export const runtime = "nodejs";
export const maxDuration = 300;

/**
 * POST /api/workflow { description, spec?, runLoop? } → runs the deterministic
 * build pipeline (interview → architect → codegen → run → gate) and returns a
 * report with a model-verifiable exit per stage. The orchestration artifact as a
 * responding URL (PLAN.md §8): each stage's `ok` is checked against an artifact,
 * not the model's say-so.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const description: string =
      typeof body?.description === "string" && body.description.trim()
        ? body.description
        : "Turn my Slack, customer calls, and email into the few moves that move revenue, and draft the outreach.";
    const report = await runWorkflow(description, {
      spec: body?.spec,
      runLoop: body?.runLoop !== false,
    });
    return NextResponse.json(report, { status: report.ok ? 200 : 422 });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
