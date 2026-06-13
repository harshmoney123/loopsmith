import { NextResponse } from "next/server";
import { connect, CONNECTOR_META } from "@/lib/connectors";

export const runtime = "nodejs";

/**
 * /api/connect — token quick-connect. POST { source, values: {KEY: value} }.
 * Persists the credential(s) so the connector goes live immediately. This is
 * the zero-config path (paste a Notion/Fathom/Slack token); OAuth is the other.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const source = String(body?.source || "");
    const values = (body?.values || {}) as Record<string, string>;
    const meta = CONNECTOR_META.find((m) => m.source === source);
    if (!meta) return NextResponse.json({ ok: false, error: "unknown connector" }, { status: 400 });

    const allowed = new Set((meta.fields || []).map((f) => f.key));
    let set = 0;
    for (const [k, v] of Object.entries(values)) {
      if (allowed.has(k) && typeof v === "string" && v.trim()) {
        await connect(k, v.trim());
        set++;
      }
    }
    if (!set) return NextResponse.json({ ok: false, error: "no valid credential provided" }, { status: 400 });
    return NextResponse.json({ ok: true, source, set });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "failed" }, { status: 500 });
  }
}
