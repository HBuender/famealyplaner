/**
 * Weather is a SOFT signal (ADR-0001): it biases LLM ranking, never the
 * deterministic eligible pool, and must never block planning. The mapping is a
 * coarse, explainable, tunable function from one day's forecast to a "mood".
 */

export type WeatherMood = "hot" | "cold" | "wet" | "comfort" | "mild";

export interface DailyForecast {
  date: string; // YYYY-MM-DD (local, Europe/Berlin)
  apparentTempMax: number | null;
  precipitationSum: number | null;
  weatherCode: number | null;
}

export interface DayMood {
  date: string;
  mood: WeatherMood | null; // null = no usable signal for that day
}

// Tunable thresholds (named constants).
export const HOT_APPARENT_C = 27;
export const COLD_APPARENT_C = 8;
export const WET_PRECIP_MM = 3;

function isSnowOrStorm(code: number): boolean {
  return (code >= 71 && code <= 77) || code === 85 || code === 86 || code >= 95;
}

function isRainy(code: number): boolean {
  return (code >= 51 && code <= 67) || (code >= 80 && code <= 82);
}

/**
 * Map one day's forecast to a coarse mood, applying rules in priority order:
 * snow/storm -> comfort; rain or meaningful precipitation -> wet; hot/cold by
 * apparent temperature; else mild. Returns null when there is no usable signal.
 */
export function moodForDay(d: DailyForecast): WeatherMood | null {
  const code = d.weatherCode;
  if (code != null && isSnowOrStorm(code)) return "comfort";
  if (
    (code != null && isRainy(code)) ||
    (d.precipitationSum != null && d.precipitationSum >= WET_PRECIP_MM)
  ) {
    return "wet";
  }
  if (d.apparentTempMax != null) {
    if (d.apparentTempMax >= HOT_APPARENT_C) return "hot";
    if (d.apparentTempMax <= COLD_APPARENT_C) return "cold";
    return "mild";
  }
  return null;
}

export function mapForecast(days: readonly DailyForecast[]): DayMood[] {
  return days.map((d) => ({ date: d.date, mood: moodForDay(d) }));
}
