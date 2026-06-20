import { type Allergen, allergensMatch } from "./taxonomy";

/**
 * A human-confirmed allergen tag on a recipe. `contains` and
 * `mayContainTraces` mirror EU FIC's declared vs. precautionary distinction;
 * for a true allergy BOTH are hard blocks (ADR-0001).
 */
export interface RecipeAllergenTag {
  allergen: Allergen;
  contains: boolean;
  mayContainTraces: boolean;
}

/**
 * Core safety primitive: is a recipe blocked for the given member allergies?
 * Blocked when any tag that `contains` OR `mayContainTraces` a matching
 * allergen is present. Used by the eligibility filter (U12) and re-validation
 * (U20) — the single allergen-blocking rule in the codebase.
 */
export function isBlockedByAllergens(
  memberAllergies: readonly Allergen[],
  recipeTags: readonly RecipeAllergenTag[],
): boolean {
  return recipeTags.some(
    (tag) =>
      (tag.contains || tag.mayContainTraces) &&
      memberAllergies.some((a) => allergensMatch(a, tag.allergen)),
  );
}
