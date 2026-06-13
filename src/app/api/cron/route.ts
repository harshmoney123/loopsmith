import { NextResponse } from "next/server";
import { GTM_LOOP } from "@/lib/spec";
import { listLoops, loadSpec } from "@/lib/store";
import { runPersisted } from "@/engine/loop";

export const runtime = "nodejs";
export const maxDuration = 300;

/**
 * SCHEDULER (PLAN.md acceptance #6 — "goes and goes").
 *
 * Vercel Cron hits this on a cadence (see vercel.json). It runs every saved
 * loop with no human present, tagging each run trigger="scheduler" and appending
 * to the durable run history + memory. Calling it twice produces ≥2 scheduler
 * runs in the timeline — the acceptance proof — and each run reads the prior
 * run's learnings, so the loop tightens itself unattended.
 *
 * Protected by CRON_SECRET when set (Vercel sends it as a Bearer token); open in
 * local dev so the scheduler can be exercised without config.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
  }

  const ids = await listLoops();
  const results: { loopId: string; score: number; pass: boolean; priorLearningCount: number }[] = [];
  const errors: { loopId: string; error: string }[] = [];

  // If nothing has been saved yet, exercise the default demo loop so the
  // scheduler always demonstrably fires.
  const targets = ids.length ? ids : ["default"];

  for (const id of targets) {
    try {
      const spec = (await loadSpec(id)) ?? GTM_LOOP;
      const { record } = await runPersisted(spec, id, "scheduler");
      results.push({
        loopId: id,
        score: record.gate.score,
        pass: record.gate.pass,
        priorLearningCount: record.priorLearningCount,
      });
    } catch (err) {
      errors.push({ loopId: id, error: err instanceof Error ? err.message : String(err) });
    }
  }

  return NextResponse.json({
    ok: true,
    firedAt: new Date().toISOString(),
    ranLoops: results.length,
    results,
    errors,
  });
}
