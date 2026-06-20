import { describe, expect, it } from "vitest";
import { moodForDay, mapForecast, type DailyForecast } from "./mood";
import { parseDaily } from "./open-meteo";

function day(over: Partial<DailyForecast> = {}): DailyForecast {
  return {
    date: "2026-06-20",
    apparentTempMax: 20,
    precipitationSum: 0,
    weatherCode: 1,
    ...over,
  };
}

describe("moodForDay", () => {
  it("hot when apparent temp is high and dry", () => {
    expect(moodForDay(day({ apparentTempMax: 30 }))).toBe("hot");
  });

  it("cold when apparent temp is low and dry", () => {
    expect(moodForDay(day({ apparentTempMax: 4 }))).toBe("cold");
  });

  it("mild in between", () => {
    expect(moodForDay(day({ apparentTempMax: 18 }))).toBe("mild");
  });

  it("comfort for snow", () => {
    expect(moodForDay(day({ weatherCode: 73, apparentTempMax: 30 }))).toBe("comfort");
  });

  it("comfort for thunderstorm", () => {
    expect(moodForDay(day({ weatherCode: 95 }))).toBe("comfort");
  });

  it("wet for rain showers", () => {
    expect(moodForDay(day({ weatherCode: 80, apparentTempMax: 30 }))).toBe("wet");
  });

  it("wet for meaningful precipitation even with a clear code", () => {
    expect(moodForDay(day({ weatherCode: 1, precipitationSum: 5 }))).toBe("wet");
  });

  it("null (no signal) when temp, precip and code are all absent", () => {
    expect(
      moodForDay(day({ apparentTempMax: null, precipitationSum: null, weatherCode: null })),
    ).toBeNull();
  });
});

describe("parseDaily", () => {
  it("zips parallel arrays by index and aligns dates 1:1", () => {
    const json = {
      daily: {
        time: ["2026-06-20", "2026-06-21"],
        apparent_temperature_max: [28, 12],
        precipitation_sum: [0, 6],
        weather_code: [1, 80],
      },
    };
    const parsed = parseDaily(json);
    expect(parsed).toHaveLength(2);
    expect(mapForecast(parsed)).toEqual([
      { date: "2026-06-20", mood: "hot" },
      { date: "2026-06-21", mood: "wet" },
    ]);
  });

  it("treats individual null field values as no-signal for that day", () => {
    const json = {
      daily: { time: ["2026-06-20"], apparent_temperature_max: [null], precipitation_sum: [null], weather_code: [null] },
    };
    expect(mapForecast(parseDaily(json))).toEqual([{ date: "2026-06-20", mood: null }]);
  });

  it("returns [] for a malformed payload (graceful degradation, never throws)", () => {
    expect(parseDaily({})).toEqual([]);
    expect(parseDaily(null)).toEqual([]);
    expect(parseDaily({ daily: { time: "nope" } })).toEqual([]);
  });
});
