import type { EffortTier } from "@/domain/eligibility/types";

/** How an adult's dinner evening reads from their calendar. */
export type Availability = "home" | "away" | "out";

export interface CalendarEvent {
  start: Date;
  end: Date;
  allDay: boolean;
  /** opaque/busy vs transparent/free (Google `transparency`). */
  busy: boolean;
  status?: "confirmed" | "tentative" | "cancelled";
}

export type SituationOutcome =
  | { manual: true; reason: string }
  | { manual: false; effortTier: EffortTier; reason: string };

function overlaps(e: CalendarEvent, start: Date, end: Date): boolean {
  return e.start < end && e.end > start;
}

/**
 * Classify one adult's dinner evening. Cancelled and tentative events are
 * ignored (we don't assume someone is out on a maybe). An all-day/multi-day
 * busy event reads as `away` (gone the whole day); a timed busy event
 * overlapping the dinner window reads as `out`; otherwise `home`.
 */
export function classifyEvening(
  events: readonly CalendarEvent[],
  dinnerStart: Date,
  dinnerEnd: Date,
): Availability {
  const active = events.filter(
    (e) => e.busy && e.status !== "cancelled" && e.status !== "tentative",
  );
  if (active.some((e) => e.allDay && overlaps(e, dinnerStart, dinnerEnd))) {
    return "away";
  }
  if (active.some((e) => !e.allDay && overlaps(e, dinnerStart, dinnerEnd))) {
    return "out";
  }
  return "home";
}

/**
 * Combine two adults' availability into an Effort Tier with surfaced
 * reasoning (never a black box). Availability to cook = "home". A day where
 * nobody is home is flagged for manual handling (no leftovers fallback). The
 * exact thresholds are a heuristic tuned for two toddlers — always overridable.
 */
export function combineSituation(
  a: Availability,
  b: Availability,
): SituationOutcome {
  const homeCount = [a, b].filter((x) => x === "home").length;
  if (homeCount === 0) {
    return { manual: true, reason: "Nobody available to cook — handle manually." };
  }
  if (homeCount === 2) {
    return {
      manual: false,
      effortTier: "relaxed",
      reason: "Both adults home — Relaxed.",
    };
  }
  // Exactly one home; the other is away or out.
  const other = a === "home" ? b : a;
  if (other === "away") {
    return {
      manual: false,
      effortTier: "express",
      reason: "One adult away all day — solo cook with the kids, Express.",
    };
  }
  return {
    manual: false,
    effortTier: "standard",
    reason: "One adult out this evening — solo cook, Standard.",
  };
}

export function deriveCookingSituation(
  adultAEvents: readonly CalendarEvent[],
  adultBEvents: readonly CalendarEvent[],
  dinnerStart: Date,
  dinnerEnd: Date,
): SituationOutcome {
  return combineSituation(
    classifyEvening(adultAEvents, dinnerStart, dinnerEnd),
    classifyEvening(adultBEvents, dinnerStart, dinnerEnd),
  );
}

/** Wall-clock offset (ms) of `tz` at the given instant, via the Intl trick. */
function tzOffsetMs(date: Date, tz: string): number {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const p = dtf.formatToParts(date).reduce<Record<string, string>>((acc, part) => {
    acc[part.type] = part.value;
    return acc;
  }, {});
  const asUTC = Date.UTC(
    +p.year,
    +p.month - 1,
    +p.day,
    +p.hour === 24 ? 0 : +p.hour,
    +p.minute,
    +p.second,
  );
  return asUTC - date.getTime();
}

/**
 * The dinner-window instants for a local date in `tz`, DST-correct. Computing
 * the window from local wall time (not UTC) is required so CET↔CEST shifts
 * don't misclassify evenings.
 */
export function dinnerWindow(
  dateISO: string,
  opts: {
    start?: [number, number];
    end?: [number, number];
    tz?: string;
  } = {},
): { start: Date; end: Date } {
  const tz = opts.tz ?? "Europe/Berlin";
  const [sh, sm] = opts.start ?? [16, 30];
  const [eh, em] = opts.end ?? [19, 30];
  const [y, mo, d] = dateISO.split("-").map(Number);
  const toInstant = (h: number, m: number) => {
    const guess = Date.UTC(y, mo - 1, d, h, m);
    const offset = tzOffsetMs(new Date(guess), tz);
    return new Date(guess - offset);
  };
  return { start: toInstant(sh, sm), end: toInstant(eh, em) };
}
