import type { CalendarEvent } from "./cooking-situation";

/**
 * Google Calendar `events.list` client (credential-gated — needs a valid OAuth
 * access token from U3). We use events.list (not freeBusy) because the
 * Cooking-Situation classifier reads event timing and all-day vs timed shape,
 * which opaque busy blocks cannot express. Untested live until credentials
 * exist; `parseEvents` is pure and unit-tested.
 */
const CAL_API = "https://www.googleapis.com/calendar/v3/calendars";

interface GoogleEventTime {
  date?: string; // all-day
  dateTime?: string; // timed (RFC3339)
}

interface GoogleEvent {
  start?: GoogleEventTime;
  end?: GoogleEventTime;
  status?: string;
  transparency?: string; // "transparent" = free; default opaque = busy
}

/** Map a Google events.list payload to the classifier's CalendarEvent shape. */
export function parseEvents(json: unknown): CalendarEvent[] {
  const items = (json as { items?: GoogleEvent[] } | null)?.items;
  if (!Array.isArray(items)) return [];
  const out: CalendarEvent[] = [];
  for (const e of items) {
    const allDay = !!e.start?.date;
    const startRaw = e.start?.dateTime ?? e.start?.date;
    const endRaw = e.end?.dateTime ?? e.end?.date;
    if (!startRaw || !endRaw) continue;
    out.push({
      start: new Date(startRaw),
      end: new Date(endRaw),
      allDay,
      busy: e.transparency !== "transparent",
      status:
        e.status === "cancelled"
          ? "cancelled"
          : e.status === "tentative"
            ? "tentative"
            : "confirmed",
    });
  }
  return out;
}

export async function fetchEvents(
  accessToken: string,
  calendarId: string,
  timeMin: Date,
  timeMax: Date,
): Promise<CalendarEvent[]> {
  const params = new URLSearchParams({
    singleEvents: "true",
    orderBy: "startTime",
    timeMin: timeMin.toISOString(),
    timeMax: timeMax.toISOString(),
  });
  const res = await fetch(
    `${CAL_API}/${encodeURIComponent(calendarId)}/events?${params}`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  if (!res.ok) {
    throw new Error(`Calendar events.list failed: ${res.status}`);
  }
  return parseEvents(await res.json());
}
