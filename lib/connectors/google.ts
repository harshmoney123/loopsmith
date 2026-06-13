import { env } from "./types";

/**
 * Shared Google OAuth2 access-token minting. AgentWeb already has
 * GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET; a per-user GOOGLE_REFRESH_TOKEN
 * (offline scope) is the only extra needed to activate Gmail + Calendar reads.
 */
export function googleConfigured(): boolean {
  return !!(env("GOOGLE_CLIENT_ID") && env("GOOGLE_CLIENT_SECRET") && env("GOOGLE_REFRESH_TOKEN"));
}

let cached: { token: string; exp: number } | null = null;

export async function googleAccessToken(): Promise<string> {
  if (cached && Date.now() < cached.exp) return cached.token;
  const body = new URLSearchParams({
    client_id: env("GOOGLE_CLIENT_ID"),
    client_secret: env("GOOGLE_CLIENT_SECRET"),
    refresh_token: env("GOOGLE_REFRESH_TOKEN"),
    grant_type: "refresh_token",
  });
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const json = (await res.json()) as { access_token?: string; expires_in?: number };
  if (!json.access_token) throw new Error("google token exchange failed");
  cached = { token: json.access_token, exp: Date.now() + (json.expires_in ?? 3000) * 1000 - 30_000 };
  return cached.token;
}
