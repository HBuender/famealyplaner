import type { Allergen } from "../allergens/taxonomy";
import type { RecipeAllergenTag } from "../allergens/match";

export const EFFORT_TIERS = ["express", "standard", "relaxed"] as const;
export type EffortTier = (typeof EFFORT_TIERS)[number];

export type Rating = "up" | "neutral" | "down";

/**
 * Pure planner view of a recipe — decoupled from the DB row so the filter is
 * unit-testable. The orchestrator (U15) maps DB rows to these.
 */
export interface RecipeCandidate {
  id: string;
  effortTier: EffortTier;
  allergenTags: RecipeAllergenTag[];
  humanConfirmed: boolean;
  /** When last cooked; null = never cooked → exploration boost (no cooldown). */
  lastCookedAt: Date | null;
  /** Latest household rating, or null if unrated. */
  rating: Rating | null;
}

export interface Eater {
  id: string;
  allergies: Allergen[];
}

export interface SlotContext {
  /** Members eating this Slot. v1 default: every is_eater member (U15). */
  eaters: Eater[];
  effortTier: EffortTier;
  /** Recipe placed here last week — never repeat it two weeks running. */
  lastWeekRecipeId?: string | null;
}

export type ExclusionReason =
  | "not_confirmed"
  | "allergen"
  | "repeat_last_week"
  | "cooldown"
  | "effort";

export interface Exclusion {
  recipeId: string;
  reason: ExclusionReason;
  detail: string;
}

/**
 * Soft predicates the relaxation ladder (U13) may switch off. There is
 * deliberately NO toggle for the allergen or not-confirmed hard predicates —
 * the ladder cannot reach them, so it can never disable safety.
 */
export interface SoftToggles {
  ignoreCooldown?: boolean;
  ignoreEffort?: boolean;
}

export interface EligibilityResult {
  eligible: RecipeCandidate[];
  excluded: Exclusion[];
}
