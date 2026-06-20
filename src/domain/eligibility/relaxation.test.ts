import { describe, expect, it } from "vitest";
import { relaxToFillSlot } from "./relaxation";
import type { RecipeCandidate, SlotContext } from "./types";

const ASOF = new Date("2026-06-20T12:00:00Z");
const daysAgo = (n: number) => new Date(ASOF.getTime() - n * 86_400_000);

function recipe(over: Partial<RecipeCandidate> = {}): RecipeCandidate {
  return {
    id: Math.random().toString(36).slice(2),
    effortTier: "standard",
    allergenTags: [],
    humanConfirmed: true,
    lastCookedAt: null,
    rating: null,
    ...over,
  };
}

const SLOT: SlotContext = { eaters: [{ id: "a", allergies: [] }], effortTier: "standard" };

describe("relaxToFillSlot", () => {
  it("applies no relaxation when the pool already meets the minimum", () => {
    const recipes = [recipe(), recipe(), recipe(), recipe()];
    const res = relaxToFillSlot(recipes, SLOT, ASOF);
    expect(res.relaxationsApplied).toEqual([]);
    expect(res.libraryTooThin).toBe(false);
    expect(res.eligible.length).toBeGreaterThanOrEqual(3);
  });

  it("relaxes cooldown first when that fills the slot", () => {
    // 3 recipes all on cooldown (cooked 5 days ago) + nothing else.
    const recipes = [
      recipe({ lastCookedAt: daysAgo(5) }),
      recipe({ lastCookedAt: daysAgo(5) }),
      recipe({ lastCookedAt: daysAgo(5) }),
    ];
    const res = relaxToFillSlot(recipes, SLOT, ASOF);
    expect(res.relaxationsApplied.map((r) => r.level)).toEqual(["cooldown"]);
    expect(res.libraryTooThin).toBe(false);
    expect(res.eligible).toHaveLength(3);
  });

  it("relaxes cooldown then effort (loud) when both are needed", () => {
    // All on cooldown AND too hard for an express slot.
    const recipes = [
      recipe({ lastCookedAt: daysAgo(5), effortTier: "relaxed" }),
      recipe({ lastCookedAt: daysAgo(5), effortTier: "relaxed" }),
      recipe({ lastCookedAt: daysAgo(5), effortTier: "relaxed" }),
    ];
    const res = relaxToFillSlot(recipes, { ...SLOT, effortTier: "express" }, ASOF);
    expect(res.relaxationsApplied.map((r) => r.level)).toEqual(["cooldown", "effort"]);
    expect(res.libraryTooThin).toBe(false);
  });

  it("reaches 'library too thin' when allergen exclusion leaves too few — and never relaxes allergens", () => {
    const nutSlot: SlotContext = { eaters: [{ id: "kid", allergies: ["hazelnut"] }], effortTier: "relaxed" };
    const recipes = [
      recipe({ allergenTags: [{ allergen: "hazelnut", contains: true, mayContainTraces: false }] }),
      recipe({ allergenTags: [{ allergen: "tree_nut", contains: true, mayContainTraces: false }] }),
    ];
    const res = relaxToFillSlot(recipes, nutSlot, ASOF);
    expect(res.libraryTooThin).toBe(true);
    expect(res.relaxationsApplied.at(-1)?.level).toBe("library_too_thin");
    // Allergen-blocked recipes are NEVER admitted, even at the terminal rung.
    expect(res.eligible).toHaveLength(0);
  });

  it("only ever emits cooldown / effort / library_too_thin levels (never variety or allergen)", () => {
    const recipes = [recipe({ lastCookedAt: daysAgo(2), effortTier: "relaxed" })];
    const res = relaxToFillSlot(recipes, { ...SLOT, effortTier: "express" }, ASOF);
    const levels = new Set(res.relaxationsApplied.map((r) => r.level));
    for (const lvl of levels) {
      expect(["cooldown", "effort", "library_too_thin"]).toContain(lvl);
    }
  });
});
