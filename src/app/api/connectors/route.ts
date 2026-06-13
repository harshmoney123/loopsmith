import { NextResponse } from "next/server";
import { connectorStatus, CONNECTOR_META } from "@/lib/connectors";

export const runtime = "nodejs";

/**
 * /api/connectors — which real connectors are live vs need credentials, plus
 * how each is connected (oauth/token) so the /connect UI can render itself.
 */
export async function GET() {
  const status = await connectorStatus();
  const bySource = Object.fromEntries(status.map((s) => [s.source, s]));
  const connectors = CONNECTOR_META.map((m) => ({
    ...m,
    configured: bySource[m.source]?.configured ?? false,
    note: bySource[m.source]?.note ?? "",
  }));
  return NextResponse.json({
    connectors,
    liveCount: connectors.filter((c) => c.configured).length,
    ts: new Date().toISOString(),
  });
}
