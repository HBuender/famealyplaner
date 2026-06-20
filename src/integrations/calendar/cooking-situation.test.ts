import { describe, expect, it } from "vitest";
import {
  classifyEvening,
  combineSituation,
  deriveCookingSituation,
  dinnerWindow,
  type CalendarEvent,
} from "./cooking-situation";
import { parseEvents } from "./events";

const DAY = "2026-06-23";
const { start: DINNER_START, end: DINNER_END } = dinnerWindow(DAY);

function timed(startISO: string, endISO: string, over: Partial<CalendarEvent> = {}): CalendarEvent {
  return { start: new Date(startISO), end: new Date(endISO), allDay: false, busy: true, ...over };
}

describe("classifyEvening", () => {
  it("home when there are no events", () => {
    expect(classifyEvening([], DINNER_START, DINNER_END)).toBe("home");
  });

  it("out when a busy timed event overlaps the dinner window", () => {
    // 17:00-18:00 Berlin (CEST = 15:00-16:00Z)
    expect(
      classifyEvening([timed("2026-06-23T15:00:00Z", "2026-06-23T16:00:00Z")], DINNER_START, DINNER_END),
    ).toBe("out");
  });

  it("home when a timed event does NOT overlap the dinner window", () => {
    // 09:00-10:00 Berlin
    expect(
      classifyEvening([timed("2026-06-23T07:00:00Z", "2026-06-23T08:00:00Z")], DINNER_START, DINNER_END),
    ).toBe("home");
  });

  it("away when an all-day busy event covers the day", () => {
    const allDay: CalendarEvent = {
      start: new Date("2026-06-23T00:00:00Z"),
      end: new Date("2026-06-24T00:00:00Z"),
      allDay: true,
      busy: true,
    };
    expect(classifyEvening([allDay], DINNER_START, DINNER_END)).toBe("away");
  });

  it("ignores cancelled and tentative events", () => {
    const overlap = "2026-06-23T15:00:00Z";
    const overlapEnd = "2026-06-23T16:00:00Z";
    expect(
      classifyEvening([timed(overlap, overlapEnd, { status: "cancelled" })], DINNER_START, DINNER_END),
    ).toBe("home");
    expect(
      classifyEvening([timed(overlap, overlapEnd, { status: "tentative" })], DINNER_START, DINNER_END),
    ).toBe("home");
  });

  it("ignores transparent (free) events", () => {
    expect(
      classifyEvening([timed("2026-06-23T15:00:00Z", "2026-06-23T16:00:00Z", { busy: false })], DINNER_START, DINNER_END),
    ).toBe("home");
  });
});

describe("combineSituation", () => {
  it("both home -> Relaxed", () => {
    expect(combineSituation("home", "home")).toMatchObject({ manual: false, effortTier: "relaxed" });
  });
  it("one home, other out -> Standard", () => {
    expect(combineSituation("home", "out")).toMatchObject({ manual: false, effortTier: "standard" });
  });
  it("one home, other away -> Express", () => {
    expect(combineSituation("away", "home")).toMatchObject({ manual: false, effortTier: "express" });
  });
  it("both out -> manual handle", () => {
    expect(combineSituation("out", "out")).toMatchObject({ manual: true });
  });
  it("away + out (nobody home) -> manual handle", () => {
    expect(combineSituation("away", "out")).toMatchObject({ manual: true });
  });
});

describe("deriveCookingSituation", () => {
  it("one adult with an evening event, the other free -> Standard with reasoning", () => {
    const res = deriveCookingSituation(
      [timed("2026-06-23T15:00:00Z", "2026-06-23T16:00:00Z")],
      [],
      DINNER_START,
      DINNER_END,
    );
    expect(res.manual).toBe(false);
    if (!res.manual) {
      expect(res.effortTier).toBe("standard");
      expect(res.reason).toMatch(/solo cook/i);
    }
  });
});

describe("dinnerWindow (DST correctness)", () => {
  it("uses CEST (UTC+2) in summer — 16:30 Berlin == 14:30Z", () => {
    const { start } = dinnerWindow("2026-07-01");
    expect(start.getUTCHours()).toBe(14);
    expect(start.getUTCMinutes()).toBe(30);
  });

  it("uses CET (UTC+1) in winter — 16:30 Berlin == 15:30Z", () => {
    const { start } = dinnerWindow("2026-01-15");
    expect(start.getUTCHours()).toBe(15);
    expect(start.getUTCMinutes()).toBe(30);
  });
});

describe("parseEvents", () => {
  it("maps timed, all-day, transparent and cancelled events", () => {
    const parsed = parseEvents({
      items: [
        { start: { dateTime: "2026-06-23T17:00:00+02:00" }, end: { dateTime: "2026-06-23T18:00:00+02:00" } },
        { start: { date: "2026-06-23" }, end: { date: "2026-06-24" } },
        { start: { dateTime: "2026-06-23T20:00:00+02:00" }, end: { dateTime: "2026-06-23T21:00:00+02:00" }, transparency: "transparent" },
        { start: { dateTime: "2026-06-23T12:00:00+02:00" }, end: { dateTime: "2026-06-23T13:00:00+02:00" }, status: "cancelled" },
      ],
    });
    expect(parsed).toHaveLength(4);
    expect(parsed[0].allDay).toBe(false);
    expect(parsed[1].allDay).toBe(true);
    expect(parsed[2].busy).toBe(false);
    expect(parsed[3].status).toBe("cancelled");
  });

  it("returns [] for a malformed payload", () => {
    expect(parseEvents({})).toEqual([]);
    expect(parseEvents(null)).toEqual([]);
  });
});
