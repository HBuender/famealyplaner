import OpenAI from "openai";

/**
 * Lazy, module-scoped OpenAI client. Construction is deferred so importing the
 * pure schema/validation helpers never requires OPENAI_API_KEY (tests stay
 * offline). Pinned dated snapshots keep behavior reproducible and unlock
 * prompt-cache discounts on the stable system+schema prefix.
 */
export const MODELS = {
  /** Vision recipe extraction (U7) — accuracy on allergens/quantities matters. */
  vision: "gpt-5.4",
  /** Arrangement / ranking (U14) — tiny pre-filtered task; cheap + fast. */
  arrange: "gpt-5.4-mini",
} as const;

let _client: OpenAI | undefined;

export function getOpenAI(): OpenAI {
  if (!_client) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error("OPENAI_API_KEY is not set");
    _client = new OpenAI({ apiKey });
  }
  return _client;
}
