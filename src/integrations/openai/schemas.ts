/**
 * Strict JSON schema for the arrangement structured output. `chosen_recipe_id`
 * is constrained to the union of all pool ids (constrained decoding =
 * defense-in-depth); arrange() additionally re-checks per-slot membership in
 * code, which is the authoritative safety guarantee. Excluded recipes are never
 * sent, so they can't appear in the enum.
 */
export function buildArrangementSchema(poolIds: readonly string[]) {
  if (poolIds.length === 0) {
    throw new Error("buildArrangementSchema requires a non-empty pool");
  }
  return {
    type: "object",
    additionalProperties: false,
    properties: {
      assignments: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            slot_id: { type: "string" },
            chosen_recipe_id: { type: "string", enum: [...poolIds] },
            rationale: { type: "string" },
          },
          required: ["slot_id", "chosen_recipe_id", "rationale"],
        },
      },
    },
    required: ["assignments"],
  };
}
