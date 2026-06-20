import { describe, expect, it, vi } from "vitest";
import { arrange, type ArrangeSlotInput, type LlmPick } from "./arrange";
import { buildArrangementSchema } from "./schemas";

function slot(slotId: string, ...ids: string[]): ArrangeSlotInput {
  return { slotId, pool: ids.map((id) => ({ id, title: id })) };
}

describe("arrange — allowlist safety guarantee", () => {
  it("accepts valid in-pool picks and preserves slot order", async () => {
    const slots = [slot("mon", "a", "b"), slot("tue", "c", "d")];
    const llm = vi.fn(async (): Promise<LlmPick[]> => [
      { slotId: "tue", chosenRecipeId: "d" },
      { slotId: "mon", chosenRecipeId: "b" },
    ]);
    const res = await arrange(slots, llm);
    expect(res.map((a) => a.slotId)).toEqual(["mon", "tue"]);
    expect(res.map((a) => a.recipeId)).toEqual(["b", "d"]);
    expect(res.every((a) => a.source === "llm")).toBe(true);
  });

  it("rejects an off-pool pick and falls back to a safe in-pool candidate", async () => {
    const slots = [slot("mon", "a", "b")];
    const llm = async (): Promise<LlmPick[]> => [
      { slotId: "mon", chosenRecipeId: "EVIL_OFF_POOL" },
    ];
    const res = await arrange(slots, llm, { maxRetries: 0 });
    expect(res[0].recipeId).toBe("a"); // deterministic top-ranked fallback
    expect(res[0].source).toBe("fallback");
    // The off-pool id is never placed.
    expect(res.some((a) => a.recipeId === "EVIL_OFF_POOL")).toBe(false);
  });

  it("rejects a duplicate recipe across slots (second slot falls back)", async () => {
    const slots = [slot("mon", "a", "b"), slot("tue", "a", "b")];
    const llm = async (): Promise<LlmPick[]> => [
      { slotId: "mon", chosenRecipeId: "a" },
      { slotId: "tue", chosenRecipeId: "a" }, // duplicate
    ];
    const res = await arrange(slots, llm, { maxRetries: 0 });
    expect(res[0].recipeId).toBe("a");
    expect(res[1].recipeId).toBe("b"); // fell back to the other in-pool option
    expect(res[1].source).toBe("fallback");
  });

  it("falls back deterministically when the LLM call throws", async () => {
    const slots = [slot("mon", "a", "b"), slot("tue", "c")];
    const llm = async (): Promise<LlmPick[]> => {
      throw new Error("OpenAI down");
    };
    const res = await arrange(slots, llm);
    expect(res.map((a) => a.recipeId)).toEqual(["a", "c"]);
    expect(res.every((a) => a.source === "fallback")).toBe(true);
  });

  it("retries once, then accepts a now-valid pick", async () => {
    const slots = [slot("mon", "a", "b")];
    let call = 0;
    const llm = async (): Promise<LlmPick[]> => {
      call += 1;
      return call === 1
        ? [{ slotId: "mon", chosenRecipeId: "off" }] // bad first
        : [{ slotId: "mon", chosenRecipeId: "b" }]; // good on retry
    };
    const res = await arrange(slots, llm, { maxRetries: 1 });
    expect(res[0].recipeId).toBe("b");
    expect(res[0].source).toBe("llm");
    expect(call).toBe(2);
  });

  it("property: every assignment is in its slot pool, for arbitrary garbage picks", async () => {
    const slots = [slot("mon", "a", "b", "c"), slot("tue", "d", "e"), slot("wed", "f")];
    const garbage = async (): Promise<LlmPick[]> => [
      { slotId: "mon", chosenRecipeId: "zzz" },
      { slotId: "tue", chosenRecipeId: "d" },
      { slotId: "wed", chosenRecipeId: "a" }, // a is not in wed's pool
    ];
    const res = await arrange(slots, garbage, { maxRetries: 0 });
    for (const a of res) {
      const pool = slots.find((s) => s.slotId === a.slotId)!.pool.map((r) => r.id);
      expect(pool).toContain(a.recipeId);
    }
  });
});

describe("buildArrangementSchema", () => {
  it("constrains chosen_recipe_id to exactly the pool ids", () => {
    const schema = buildArrangementSchema(["a", "b", "c"]);
    const item = schema.properties.assignments.items as {
      properties: { chosen_recipe_id: { enum: string[] } };
      additionalProperties: boolean;
    };
    expect(item.properties.chosen_recipe_id.enum).toEqual(["a", "b", "c"]);
    expect(item.additionalProperties).toBe(false);
  });

  it("throws on an empty pool (U15 must never send one)", () => {
    expect(() => buildArrangementSchema([])).toThrow();
  });
});
