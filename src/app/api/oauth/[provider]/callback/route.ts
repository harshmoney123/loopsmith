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

    if (provider === "notion") {
      const basic = Buffer.from(`${env("NOTION_OAUTH_CLIENT_ID")}:${env("NOTION_OAUTH_CLIENT_SECRET")}`).toString("base64");
      const res = await fetch("https://api.notion.com/v1/oauth/token", {
        method: "POST",
        headers: { Authorization: `Basic ${basic}`, "Content-Type": "application/json" },
        body: JSON.stringify({ grant_type: "authorization_code", code, redirect_uri: redirectUri }),
      }).then((r) => r.json() as Promise<{ access_token?: string; error?: string }>);
      if (!res.access_token) return back(`error=${encodeURIComponent(res.error || "no_token")}`);
      await connect("NOTION_TOKEN", res.access_token);

      // Auto-pick a database the user granted, so they never hunt for a DB id.
      try {
        const db = await fetch("https://api.notion.com/v1/search", {
          method: "POST",
          headers: { Authorization: `Bearer ${res.access_token}`, "Notion-Version": "2022-06-28", "Content-Type": "application/json" },
          body: JSON.stringify({ filter: { property: "object", value: "database" }, page_size: 1 }),
        }).then((r) => r.json() as Promise<{ results?: { id: string }[] }>);
        if (db.results?.[0]?.id) await connect("NOTION_TASKS_DB", db.results[0].id);
      } catch {
        /* task DB optional — read still works */
      }
      return back("connected=notion");
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
