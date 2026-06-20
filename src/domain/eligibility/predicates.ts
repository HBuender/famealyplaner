import { isBlockedByAllergens } from "../allergens/match";
import type { EffortTier, RecipeCandidate, SlotContext } from "./types";

const EFFORT_RANK: Record<EffortTier, number> = {
  express: 1,
  standard: 2,
  relaxed: 3,
};

export const COOLDOWN_DAYS = 21;
export const FAVORITE_COOLDOWN_DAYS = 14;
export const DISLIKED_COOLDOWN_DAYS = 35;

const MS_PER_DAY = 86_400_000;

export function daysBetween(earlier: Date, later: Date): number {
  return Math.floor((later.getTime() - earlier.getTime()) / MS_PER_DAY);
}

// --- HARD predicates (no relaxation toggle; live separately from soft ones) ---

/** A recipe must be human-confirmed to be eligible (ADR-0001 read-path gate). */
export function isUnconfirmed(r: RecipeCandidate): boolean {
  return !r.humanConfirmed;
}

/** Blocked if any eater's allergy matches a contains / may-contain-traces tag. */
export function violatesAllergen(r: RecipeCandidate, slot: SlotContext): boolean {
  const allergies = slot.eaters.flatMap((e) => e.allergies);
  return isBlockedByAllergens(allergies, r.allergenTags);
}

/** Never the same recipe two weeks running (hard quality rule). */
export function isRepeatOfLastWeek(
  r: RecipeCandidate,
  slot: SlotContext,
): boolean {
  return !!slot.lastWeekRecipeId && r.id === slot.lastWeekRecipeId;
}

// --- SOFT predicates (relaxable by the U13 ladder) ---

/** Cooldown window in days: favorites return sooner, dislikes linger longer. */
export function cooldownWindowDays(r: RecipeCandidate): number {
  if (r.rating === "up") return FAVORITE_COOLDOWN_DAYS;
  if (r.rating === "down") return DISLIKED_COOLDOWN_DAYS;
  return COOLDOWN_DAYS;
}

export function isOnCooldown(r: RecipeCandidate, asOfDate: Date): boolean {
  if (!r.lastCookedAt) return false; // never cooked → exploration boost
  return daysBetween(r.lastCookedAt, asOfDate) < cooldownWindowDays(r);
}

/** Recipe effort must be at or below the slot's tier. */
export function exceedsEffort(r: RecipeCandidate, slot: SlotContext): boolean {
  return EFFORT_RANK[r.effortTier] > EFFORT_RANK[slot.effortTier];
}
