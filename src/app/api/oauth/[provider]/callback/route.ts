import { NextResponse } from "next/server";
import { env } from "@/lib/connectors/types";
import { connect } from "@/lib/connectors";

export const runtime = "nodejs";

/**
 * OAuth callback — exchanges the code for tokens and stores the credential so
 * the connector goes live, then bounces back to /connect.
 */
export async function GET(req: Request, ctx: { params: Promise<{ provider: string }> }) {
  const { provider } = await ctx.params;
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const back = (q: string) => NextResponse.redirect(`${url.origin}/connect?${q}`);

  if (url.searchParams.get("error")) return back(`error=${encodeURIComponent(url.searchParams.get("error")!)}`);
  if (!code) return back("error=missing_code");
  const redirectUri = `${url.origin}/api/oauth/${provider}/callback`;

  try {
    if (provider === "google") {
      const res = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code,
          client_id: env("GOOGLE_CLIENT_ID"),
          client_secret: env("GOOGLE_CLIENT_SECRET"),
          redirect_uri: redirectUri,
          grant_type: "authorization_code",
        }),
      }).then((r) => r.json() as Promise<{ refresh_token?: string; error?: string }>);
      if (!res.refresh_token) return back(`error=${encodeURIComponent(res.error || "no_refresh_token")}`);
      await connect("GOOGLE_REFRESH_TOKEN", res.refresh_token);
      return back("connected=google");
    }

    if (provider === "slack") {
      const res = await fetch("https://slack.com/api/oauth.v2.access", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code,
          client_id: env("SLACK_CLIENT_ID"),
          client_secret: env("SLACK_CLIENT_SECRET"),
          redirect_uri: redirectUri,
        }),
      }).then((r) => r.json() as Promise<{ access_token?: string; error?: string }>);
      if (!res.access_token) return back(`error=${encodeURIComponent(res.error || "no_token")}`);
      await connect("SLACK_BOT_TOKEN", res.access_token);
      return back("connected=slack");
    }

    return back("error=unknown_provider");
  } catch (e) {
    return back(`error=${encodeURIComponent(e instanceof Error ? e.message : "exchange_failed")}`);
  }
}
