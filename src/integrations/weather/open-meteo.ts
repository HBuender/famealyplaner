import type { DailyForecast } from "./mood";

/** Fixed location: Cologne, Germany (50999). No API key required. */
export const COLOGNE = { latitude: 50.94, longitude: 6.96 } as const;

const FORECAST_URL = "https://api.open-meteo.com/v1/forecast";

export interface ForecastResult {
  days: DailyForecast[];
  /** false = the call failed; weather is dropped as a soft signal. */
  available: boolean;
}

/**
 * Parse Open-Meteo's parallel daily arrays into per-day records, zipping by
 * index against `daily.time`. Tolerates missing fields / nulls and returns []
 * for a malformed payload (never throws) — weather must never block planning.
 */
export function parseDaily(json: unknown): DailyForecast[] {
  const daily = (json as { daily?: Record<string, unknown> } | null)?.daily;
  const time = daily?.time;
  if (!Array.isArray(time)) return [];
  const appTemp = daily?.apparent_temperature_max as (number | null)[] | undefined;
  const precip = daily?.precipitation_sum as (number | null)[] | undefined;
  const code = daily?.weather_code as (number | null)[] | undefined;
  return time.map((date: string, i: number) => ({
    date,
    apparentTempMax: appTemp?.[i] ?? null,
    precipitationSum: precip?.[i] ?? null,
    weatherCode: code?.[i] ?? null,
  }));
}

/**
 * Fetch the 7-day Cologne forecast server-side with a short timeout. Any
 * failure (timeout, non-200, malformed) degrades to `{ days: [], available:
 * false }` so planning proceeds on season tags alone.
 */
export async function fetchForecast(
  opts: { timeoutMs?: number } = {},
): Promise<ForecastResult> {
  const params = new URLSearchParams({
    latitude: String(COLOGNE.latitude),
    longitude: String(COLOGNE.longitude),
    daily:
      "temperature_2m_max,temperature_2m_min,apparent_temperature_max,precipitation_sum,weather_code",
    timezone: "Europe/Berlin",
    forecast_days: "7",
  });
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), opts.timeoutMs ?? 4000);
  try {
    const res = await fetch(`${FORECAST_URL}?${params}`, {
      signal: controller.signal,
    });
    if (!res.ok) return { days: [], available: false };
    const days = parseDaily(await res.json());
    return { days, available: days.length > 0 };
  } catch {
    return { days: [], available: false };
  } finally {
    clearTimeout(timer);
  }
}
