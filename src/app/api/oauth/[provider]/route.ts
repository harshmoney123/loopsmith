import { NextResponse } from "next/server";
import { env } from "@/lib/connectors/types";

export const runtime = "nodejs";

/**
 * /api/oauth/[provider] — kicks off the OAuth consent flow. The user is sent to
 * Google/Slack, approves, and lands on /api/oauth/[provider]/callback which
 * stores the credential. The provider app must whitelist the redirect URI
 * printed at /connect.
 */
export async function GET(req: Request, ctx: { params: Promise<{ provider: string }> }) {
  const { provider } = await ctx.params;
  const origin = new URL(req.url).origin;
  const redirectUri = `${origin}/api/oauth/${provider}/callback`;

  if (provider === "google") {
    const clientId = env("GOOGLE_CLIENT_ID");
    if (!clientId) return bad("Google OAuth not configured (GOOGLE_CLIENT_ID missing)");
    const scope = [
      "https://www.googleapis.com/auth/gmail.readonly",
      "https://www.googleapis.com/auth/gmail.compose",
      "https://www.googleapis.com/auth/calendar.readonly",
    ].join(" ");
    const url =
      "https://accounts.google.com/o/oauth2/v2/auth?" +
      new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirectUri,
        response_type: "code",
        access_type: "offline",
        prompt: "consent",
        include_granted_scopes: "true",
        scope,
      }).toString();
    return NextResponse.redirect(url);
  }

  if (provider === "slack") {
    const clientId = env("SLACK_CLIENT_ID");
    if (!clientId) return bad("Slack OAuth not configured (SLACK_CLIENT_ID missing) — use token paste instead");
    const url =
      "https://slack.com/oauth/v2/authorize?" +
      new URLSearchParams({
        client_id: clientId,
        scope: "channels:read,channels:history,chat:write",
        redirect_uri: redirectUri,
      }).toString();
    return NextResponse.redirect(url);
  }

  return bad("unknown provider");
}

function bad(msg: string) {
  return NextResponse.json({ ok: false, error: msg }, { status: 400 });
}
