import { computeEligiblePool } from "./filter";
import type { RecipeCandidate, SlotContext } from "./types";

/** A slot needs at least this many candidates before the ladder is satisfied. */
export const MIN_CANDIDATES = 3;

export type RelaxationLevel = "cooldown" | "effort" | "library_too_thin";

export interface RelaxationApplied {
  level: RelaxationLevel;
  detail: string;
}

export interface RelaxedPool {
  eligible: RecipeCandidate[];
  relaxationsApplied: RelaxationApplied[];
  /** True when even full soft relaxation can't reach MIN_CANDIDATES. */
  libraryTooThin: boolean;
}

/**
 * Relaxation ladder (U13). Triggered per-slot when the eligible pool has fewer
 * than `minCandidates`. Re-runs the same pure filter (U12) dropping one more
 * SOFT predicate per rung, in fixed order:
 *   cooldown -> effort (loudly flagged) -> "library too thin".
 *
 * Within-week variety is NOT a rung — it is an LLM arrangement objective (U14).
 * The allergen / not-confirmed hard predicates are structurally unreachable
 * here: this module only ever sets the soft toggles, never a hard one.
 */
export function relaxToFillSlot(
  recipes: readonly RecipeCandidate[],
  slot: SlotContext,
  asOfDate: Date,
  minCandidates = MIN_CANDIDATES,
): RelaxedPool {
  // Rung 0: no relaxation.
  let result = computeEligiblePool(recipes, slot, asOfDate);
  if (result.eligible.length >= minCandidates) {
    return { eligible: result.eligible, relaxationsApplied: [], libraryTooThin: false };
  }

  // Rung 1: relax cooldown.
  result = computeEligiblePool(recipes, slot, asOfDate, { ignoreCooldown: true });
  if (result.eligible.length >= minCandidates) {
    return {
      eligible: result.eligible,
      relaxationsApplied: [
        { level: "cooldown", detail: "cooldown relaxed to fill the slot" },
      ],
      libraryTooThin: false,
    };
  }

  // Rung 2: relax cooldown + effort (loudly flagged).
  result = computeEligiblePool(recipes, slot, asOfDate, {
    ignoreCooldown: true,
    ignoreEffort: true,
  });
  if (result.eligible.length >= minCandidates) {
    return {
      eligible: result.eligible,
      relaxationsApplied: [
        { level: "cooldown", detail: "cooldown relaxed to fill the slot" },
        {
          level: "effort",
          detail: "effort tier relaxed — a harder meal may land on a busy night",
        },
      ],
      libraryTooThin: false,
    };
  }

  // Terminal: still too thin even after dropping every soft predicate. The
  // remaining `eligible` are still allergen-safe (hard predicates held).
  return {
    eligible: result.eligible,
    relaxationsApplied: [
      {
        level: "library_too_thin",
        detail: "not enough safe recipes — import or add recipes to the Library",
      },
    ],
    libraryTooThin: true,
  };
}
