import { MODELS } from "./client";
import { buildArrangementSchema } from "./schemas";
import type { ArrangeLlm, ArrangeSlotInput, LlmPick } from "./arrange";

/**
 * The real OpenAI arrangement call (credential-gated — needs OPENAI_API_KEY;
 * untested live until a key exists). Kept separate from arrange()'s pure core,
 * which is injected with this as its `callLlm`. Uses the Responses API +
 * Structured Outputs (strict) per the project KTDs.
 */
const RESPONSES_URL = "https://api.openai.com/v1/responses";

export interface ArrangeContext {
  weatherMoods?: { date: string; mood: string | null }[];
  season?: string;
  standingWishes?: string[];
  perWeekWish?: string;
  /** Soft bias only — can never make a recipe eligible/ineligible (U14). */
  memberDislikes?: string[];
  memberSubstitutions?: string[];
}

const SYSTEM_PROMPT = [
  "You arrange a week of family dinners by choosing ONE recipe per slot from",
  "that slot's provided candidate pool. You may ONLY choose ids present in the",
  "pool — never invent or substitute. Optimize for within-week variety (spread",
  "protein, carb base, cuisine), season/weather mood, kid-friendliness, and",
  "ratings. Treat dislikes as soft negative bias and substitution preferences",
  "as a soft 'favor a free-from variant' hint; neither can override the pool.",
].join(" ");

/** Pull the concatenated text output from a Responses API payload. */
function extractOutputText(json: unknown): string {
  const j = json as {
    output_text?: string;
    output?: { content?: { type?: string; text?: string }[] }[];
  };
  if (typeof j.output_text === "string") return j.output_text;
  const parts = j.output?.flatMap((o) => o.content ?? []) ?? [];
  return parts
    .filter((c) => c.type === "output_text" && typeof c.text === "string")
    .map((c) => c.text)
    .join("");
}

export function openAiArrangeLlm(context: ArrangeContext = {}): ArrangeLlm {
  return async (slots: ArrangeSlotInput[]): Promise<LlmPick[]> => {
    const poolIds = [...new Set(slots.flatMap((s) => s.pool.map((r) => r.id)))];
    if (poolIds.length === 0) return [];
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error("OPENAI_API_KEY is not set");

    const res = await fetch(RESPONSES_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: MODELS.arrange,
        input: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: JSON.stringify({ slots, context }) },
        ],
        text: {
          format: {
            type: "json_schema",
            name: "arrangement",
            strict: true,
            schema: buildArrangementSchema(poolIds),
          },
        },
      }),
    });
    if (!res.ok) throw new Error(`OpenAI arrange failed: ${res.status}`);

    const parsed = JSON.parse(extractOutputText(await res.json()) || "{}") as {
      assignments?: { slot_id: string; chosen_recipe_id: string; rationale?: string }[];
    };
    return (parsed.assignments ?? []).map((a) => ({
      slotId: a.slot_id,
      chosenRecipeId: a.chosen_recipe_id,
      rationale: a.rationale,
    }));
  };
}
