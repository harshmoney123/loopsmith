import { NextResponse } from "next/server";
import { connectorStatus } from "@/lib/connectors";

export const runtime = "nodejs";

/**
 * /api/connectors — which real connectors are live vs need credentials.
 * Lets the UI show a connection panel (like AgentWeb's "connected accounts")
 * and proves the sensor/tools layer is real, not mocked.
 */
export async function GET() {
  const connectors = connectorStatus();
  return NextResponse.json({
    connectors,
    liveCount: connectors.filter((c) => c.configured).length,
    ts: new Date().toISOString(),
  });
}
