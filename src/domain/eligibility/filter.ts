import {
  cooldownWindowDays,
  exceedsEffort,
  isOnCooldown,
  isRepeatOfLastWeek,
  isUnconfirmed,
  violatesAllergen,
} from "./predicates";
import type {
  EligibilityResult,
  Exclusion,
  RecipeCandidate,
  SlotContext,
  SoftToggles,
} from "./types";

/**
 * The deterministic eligibility filter (ADR-0001) — the single safety boundary
 * re-used by every recipe-placement path (U9/U15/U16/U20). Pure: no I/O, no
 * Date.now(), no RNG — `asOfDate` is injected so the result is reproducible and
 * property-testable.
 *
 * Hard predicates (not-confirmed, allergen) run first and have NO toggle, so
 * the relaxation ladder can never disable safety. Soft predicates (cooldown,
 * effort) are switched off via `toggles` when the ladder relaxes them.
 */
export function computeEligiblePool(
  recipes: readonly RecipeCandidate[],
  slot: SlotContext,
  asOfDate: Date,
  toggles: SoftToggles = {},
): EligibilityResult {
  const eligible: RecipeCandidate[] = [];
  const excluded: Exclusion[] = [];

  for (const r of recipes) {
    // --- HARD predicates (never relaxable) ---
    if (isUnconfirmed(r)) {
      excluded.push({
        recipeId: r.id,
        reason: "not_confirmed",
        detail: "recipe is not human-confirmed",
      });
      continue;
    }
    if (violatesAllergen(r, slot)) {
      excluded.push({
        recipeId: r.id,
        reason: "allergen",
        detail: "allergen violation for an eater",
      });
      continue;
    }
    if (isRepeatOfLastWeek(r, slot)) {
      excluded.push({
        recipeId: r.id,
        reason: "repeat_last_week",
        detail: "same recipe as last week",
      });
      continue;
    }

    // --- SOFT predicates (relaxable by the U13 ladder) ---
    if (!toggles.ignoreCooldown && isOnCooldown(r, asOfDate)) {
      excluded.push({
        recipeId: r.id,
        reason: "cooldown",
        detail: `on cooldown (${cooldownWindowDays(r)}d window)`,
      });
      continue;
    }
    if (!toggles.ignoreEffort && exceedsEffort(r, slot)) {
      excluded.push({
        recipeId: r.id,
        reason: "effort",
        detail: `effort ${r.effortTier} exceeds slot ${slot.effortTier}`,
      });
      continue;
    }

    eligible.push(r);
  }

  return { eligible, excluded };
}
