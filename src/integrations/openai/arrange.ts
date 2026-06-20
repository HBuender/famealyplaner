/**
 * LLM arrangement (OpenAI Job 2) with a CODE-SIDE allowlist guarantee
 * (ADR-0001). The model only reorders within an already-safe pool; constrained
 * decoding (enum of pool ids) is defense-in-depth, but the authoritative
 * guarantee is `arrange()` re-checking every chosen id against the slot's pool.
 * An off-pool, duplicate, or missing pick deterministically falls back to a
 * safe in-pool candidate — an off-pool recipe can never be placed.
 */

export interface ArrangePoolItem {
  id: string;
  title: string;
  tags?: string[];
  season?: string[];
  kidFriendly?: boolean;
  rating?: "up" | "neutral" | "down" | null;
  lastCookedAt?: string | null;
}

export interface ArrangeSlotInput {
  slotId: string;
  /** The slot's eligible pool (non-empty — U15 never sends an empty pool). */
  pool: ArrangePoolItem[];
}

export interface LlmPick {
  slotId: string;
  chosenRecipeId: string;
  rationale?: string;
}

export interface SlotAssignment {
  slotId: string;
  recipeId: string;
  rationale?: string;
  source: "llm" | "fallback";
}

export type ArrangeLlm = (slots: ArrangeSlotInput[]) => Promise<LlmPick[]>;

/**
 * Resolve LLM picks into safe assignments, retrying the LLM up to `maxRetries`
 * times for slots it couldn't validly fill, then falling back deterministically
 * to the top-ranked unused in-pool candidate. Returns assignments in the
 * original slot order. Every returned `recipeId` is guaranteed to be in that
 * slot's pool.
 */
export async function arrange(
  slots: ArrangeSlotInput[],
  callLlm: ArrangeLlm,
  opts: { maxRetries?: number } = {},
): Promise<SlotAssignment[]> {
  const maxAttempts = (opts.maxRetries ?? 1) + 1;
  const assignments = new Map<string, SlotAssignment>();
  const used = new Set<string>();
  let remaining = [...slots];

  for (let attempt = 0; attempt < maxAttempts && remaining.length > 0; attempt++) {
    let picks: LlmPick[] = [];
    try {
      picks = await callLlm(remaining);
    } catch {
      picks = [];
    }
    const pickBySlot = new Map(picks.map((p) => [p.slotId, p]));
    const stillRemaining: ArrangeSlotInput[] = [];
    for (const slot of remaining) {
      const pick = pickBySlot.get(slot.slotId);
      const inPool =
        !!pick && slot.pool.some((r) => r.id === pick.chosenRecipeId);
      if (pick && inPool && !used.has(pick.chosenRecipeId)) {
        used.add(pick.chosenRecipeId);
        assignments.set(slot.slotId, {
          slotId: slot.slotId,
          recipeId: pick.chosenRecipeId,
          rationale: pick.rationale,
          source: "llm",
        });
      } else {
        stillRemaining.push(slot);
      }
    }
    remaining = stillRemaining;
  }

  // Deterministic fallback: the top-ranked (pool[0]) unused in-pool candidate.
  for (const slot of remaining) {
    const candidate =
      slot.pool.find((r) => !used.has(r.id)) ?? slot.pool[0];
    if (candidate) {
      used.add(candidate.id);
      assignments.set(slot.slotId, {
        slotId: slot.slotId,
        recipeId: candidate.id,
        source: "fallback",
      });
    }
  }

  return slots
    .map((s) => assignments.get(s.slotId))
    .filter((a): a is SlotAssignment => a !== undefined);
}
