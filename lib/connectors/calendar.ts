import type { Signal } from "@/lib/types";
import { type Connector } from "./types";
import { googleConfigured, googleAccessToken } from "./google";

/**
 * Calendar connector — upcoming events from the primary Google Calendar.
 * Activates when Google OAuth (incl. a refresh token) is configured.
 */
export const calendar: Connector = {
  source: "calendar",
  label: "Calendar",
  note: "set GOOGLE_REFRESH_TOKEN (calendar.readonly) — client id/secret already present",

  configured() {
    return googleConfigured();
  },

  async read(limit) {
    if (!googleConfigured()) return [];
    try {
      const token = await googleAccessToken();
      const now = new Date().toISOString();
      const url =
        `https://www.googleapis.com/calendar/v3/calendars/primary/events` +
        `?timeMin=${encodeURIComponent(now)}&maxResults=${limit}&singleEvents=true&orderBy=startTime`;
      const data = await fetch(url, { headers: { Authorization: `Bearer ${token}` } }).then(
        (r) => r.json() as Promise<{ items?: Record<string, unknown>[] }>,
      );
      return (data.items || []).map((e) => {
        const start = (e.start as Record<string, string>) || {};
        return {
          source: "calendar",
          ts: start.dateTime || start.date || new Date().toISOString(),
          actor: (e.summary as string) || "Event",
          text: `Upcoming: ${(e.summary as string) || "event"}${e.location ? ` @ ${e.location}` : ""}`,
          meta: { attendees: (e.attendees as unknown[])?.length ?? 0 },
        } as Signal;
      });
    } catch {
      return [];
    }
  },
};
