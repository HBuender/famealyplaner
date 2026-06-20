import { describe, expect, it } from "vitest";
import { computeEligiblePool } from "./filter";
import type { Eater, RecipeCandidate, SlotContext } from "./types";
import { isBlockedByAllergens } from "../allergens/match";
import type { Allergen } from "../allergens/taxonomy";

const ASOF = new Date("2026-06-20T12:00:00Z");
const daysAgo = (n: number) => new Date(ASOF.getTime() - n * 86_400_000);

function recipe(over: Partial<RecipeCandidate> = {}): RecipeCandidate {
  return {
    id: "r1",
    effortTier: "standard",
    allergenTags: [],
    humanConfirmed: true,
    lastCookedAt: null,
    rating: null,
    ...over,
  };
}

const FOUR_YO: Eater = { id: "kid", allergies: ["hazelnut", "macadamia"] };
const ADULT: Eater = { id: "adult", allergies: [] };

function slot(over: Partial<SlotContext> = {}): SlotContext {
  return { eaters: [ADULT, FOUR_YO], effortTier: "relaxed", ...over };
}

describe("computeEligiblePool — allergen safety (hard)", () => {
  it("excludes a contains:hazelnut recipe when the allergic child is an eater", () => {
    const r = recipe({
      allergenTags: [{ allergen: "hazelnut", contains: true, mayContainTraces: false }],
    });
    const res = computeEligiblePool([r], slot(), ASOF);
    expect(res.eligible).toHaveLength(0);
    expect(res.excluded[0]).toMatchObject({ recipeId: "r1", reason: "allergen" });
  });

  it("admits the same recipe when the eaters set excludes the allergic child", () => {
    const r = recipe({
      allergenTags: [{ allergen: "hazelnut", contains: true, mayContainTraces: false }],
    });
    const res = computeEligiblePool([r], slot({ eaters: [ADULT] }), ASOF);
    expect(res.eligible.map((x) => x.id)).toEqual(["r1"]);
  });

  it("excludes a may_contain_traces:macadamia recipe (precautionary blocks)", () => {
    const r = recipe({
      allergenTags: [{ allergen: "macadamia", contains: false, mayContainTraces: true }],
    });
    expect(computeEligiblePool([r], slot(), ASOF).eligible).toHaveLength(0);
  });

  it("allergen exclusion holds even when ALL soft predicates are relaxed", () => {
    const r = recipe({
      effortTier: "relaxed",
      lastCookedAt: daysAgo(1),
      allergenTags: [{ allergen: "tree_nut", contains: true, mayContainTraces: false }],
    });
    const res = computeEligiblePool([r], slot({ effortTier: "express" }), ASOF, {
      ignoreCooldown: true,
      ignoreEffort: true,
    });
    expect(res.eligible).toHaveLength(0);
    expect(res.excluded[0].reason).toBe("allergen");
  });
});

describe("computeEligiblePool — confirmation gate (hard)", () => {
  it("excludes a not-human-confirmed recipe as ineligible", () => {
    const r = recipe({ humanConfirmed: false });
    const res = computeEligiblePool([r], slot(), ASOF);
    expect(res.eligible).toHaveLength(0);
    expect(res.excluded[0].reason).toBe("not_confirmed");
  });
});

describe("computeEligiblePool — cooldown (soft)", () => {
  it("excludes a recipe cooked 10 days ago (within the 21d default window)", () => {
    const r = recipe({ lastCookedAt: daysAgo(10) });
    expect(computeEligiblePool([r], slot(), ASOF).excluded[0].reason).toBe("cooldown");
  });

  it("a 👍 favorite returns sooner (eligible at 16 days, before the default 21)", () => {
    const r = recipe({ lastCookedAt: daysAgo(16), rating: "up" });
    expect(computeEligiblePool([r], slot(), ASOF).eligible).toHaveLength(1);
  });

  it("a new/unrated recipe (never cooked) gets the exploration boost", () => {
    const r = recipe({ lastCookedAt: null });
    expect(computeEligiblePool([r], slot(), ASOF).eligible).toHaveLength(1);
  });

  it("cooldown can be relaxed via toggle", () => {
    const r = recipe({ lastCookedAt: daysAgo(10) });
    expect(
      computeEligiblePool([r], slot(), ASOF, { ignoreCooldown: true }).eligible,
    ).toHaveLength(1);
  });
});

describe("computeEligiblePool — never twice running (hard)", () => {
  it("excludes the exact recipe placed last week", () => {
    const r = recipe({ id: "last" });
    const res = computeEligiblePool([r], slot({ lastWeekRecipeId: "last" }), ASOF);
    expect(res.excluded[0].reason).toBe("repeat_last_week");
  });
});

describe("computeEligiblePool — effort (soft)", () => {
  it("excludes a recipe whose effort exceeds the slot tier", () => {
    const r = recipe({ effortTier: "relaxed" });
    const res = computeEligiblePool([r], slot({ effortTier: "express" }), ASOF);
    expect(res.excluded[0].reason).toBe("effort");
  });

  it("admits effort <= tier", () => {
    const r = recipe({ effortTier: "express" });
    expect(
      computeEligiblePool([r], slot({ effortTier: "standard" }), ASOF).eligible,
    ).toHaveLength(1);
  });

  it("effort can be relaxed via toggle", () => {
    const r = recipe({ effortTier: "relaxed" });
    expect(
      computeEligiblePool([r], slot({ effortTier: "express" }), ASOF, {
        ignoreEffort: true,
      }).eligible,
    ).toHaveLength(1);
  });
});

describe("computeEligiblePool — empty pool", () => {
  it("returns empty eligible with reasons, not an error", () => {
    const r = recipe({
      allergenTags: [{ allergen: "hazelnut", contains: true, mayContainTraces: false }],
    });
    const res = computeEligiblePool([r], slot(), ASOF);
    expect(res.eligible).toEqual([]);
    expect(res.excluded).toHaveLength(1);
  });
});

describe("computeEligiblePool — property: no eligible recipe violates an eater allergy", () => {
  // Deterministic LCG so the property test is reproducible (no Math.random).
  function lcg(seed: number) {
    let s = seed >>> 0;
    return () => {
      s = (1664525 * s + 1013904223) >>> 0;
      return s / 0xffffffff;
    };
  }

  it("holds across randomized inputs", () => {
    const ALLERGENS: Allergen[] = ["hazelnut", "macadamia", "almond", "tree_nut", "peanut", "milk"];
    const TIERS = ["express", "standard", "relaxed"] as const;
    const rand = lcg(42);
    const pick = <T,>(arr: readonly T[]) => arr[Math.floor(rand() * arr.length)];

    for (let iter = 0; iter < 500; iter++) {
      const recipes: RecipeCandidate[] = Array.from(
        { length: 1 + Math.floor(rand() * 8) },
        (_, i) => ({
          id: `r${i}`,
          effortTier: pick(TIERS),
          allergenTags:
            rand() > 0.5
              ? [
                  {
                    allergen: pick(ALLERGENS),
                    contains: rand() > 0.5,
                    mayContainTraces: rand() > 0.5,
                  },
                ]
              : [],
          humanConfirmed: rand() > 0.1,
          lastCookedAt: rand() > 0.5 ? daysAgo(Math.floor(rand() * 60)) : null,
          rating: pick(["up", "down", "neutral", null] as const),
        }),
      );
      const eaters: Eater[] = [
        ADULT,
        { id: "kid", allergies: [pick(ALLERGENS), pick(ALLERGENS)] },
      ];
      const ctx = slot({ eaters, effortTier: pick(TIERS) });
      const toggles = { ignoreCooldown: rand() > 0.5, ignoreEffort: rand() > 0.5 };

      const { eligible } = computeEligiblePool(recipes, ctx, ASOF, toggles);
      const allergies = eaters.flatMap((e) => e.allergies);
      for (const r of eligible) {
        expect(isBlockedByAllergens(allergies, r.allergenTags)).toBe(false);
        expect(r.humanConfirmed).toBe(true);
      }
    }
  });
});
