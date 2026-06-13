import type { LoopSpec } from "@/lib/types";
import { generateRepo } from "@/builder/codegen";

export const runtime = "nodejs";

/**
 * POST { spec } → the generated Claude Code project files (the artifact the
 * user keeps). Deterministic, so this is instant.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const spec = body?.spec as LoopSpec | undefined;
    if (!spec?.name || !Array.isArray(spec.sensors)) {
      return Response.json({ error: "valid spec required" }, { status: 400 });
    }
    return Response.json({ files: generateRepo(spec) });
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
