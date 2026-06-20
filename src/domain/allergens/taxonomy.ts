/**
 * Allergen taxonomy (ADR-0001). Two levels:
 *  - EU-14 categories (the FIC Annex II mandatory allergens, relevant subset)
 *  - specific tree nuts that roll up to the `tree_nut` category
 *
 * Matching is hierarchical and conservative: a member's specific allergy
 * (e.g. hazelnut) is blocked by a recipe tagged with the broader category
 * (tree_nut), because the category could contain the specific nut. Sibling
 * specifics (almond vs hazelnut) do NOT match — that would be an annoying
 * false positive, not a safety risk.
 */

export const ALLERGEN_CATEGORIES = [
  "gluten",
  "crustaceans",
  "egg",
  "fish",
  "peanut",
  "soy",
  "milk",
  "tree_nut",
  "celery",
  "mustard",
  "sesame",
  "sulphite",
  "lupin",
  "mollusc",
] as const;

/** Specific tree nuts that roll up to the `tree_nut` category. */
export const TREE_NUTS = [
  "almond",
  "hazelnut",
  "walnut",
  "cashew",
  "pecan",
  "brazil_nut",
  "pistachio",
  "macadamia",
] as const;

export type AllergenCategory = (typeof ALLERGEN_CATEGORIES)[number];
export type TreeNut = (typeof TREE_NUTS)[number];
export type Allergen = AllergenCategory | TreeNut;

/** Full enumerated value list (categories + specifics) for the DB enum. */
export const ALLERGEN_VALUES = [...ALLERGEN_CATEGORIES, ...TREE_NUTS] as [
  string,
  ...string[],
];

const PARENT: Partial<Record<Allergen, AllergenCategory>> = Object.fromEntries(
  TREE_NUTS.map((n) => [n, "tree_nut" as const]),
) as Partial<Record<Allergen, AllergenCategory>>;

/** The broader category an allergen rolls up to, if any. */
export function parentOf(a: Allergen): AllergenCategory | undefined {
  return PARENT[a];
}

/**
 * Conservative hierarchical match between a member's allergy and a recipe's
 * allergen tag. True when they are equal, or when one is the ancestor
 * category of the other. Sibling specifics never match.
 */
export function allergensMatch(
  memberAllergy: Allergen,
  recipeTag: Allergen,
): boolean {
  if (memberAllergy === recipeTag) return true;
  if (parentOf(memberAllergy) === recipeTag) return true; // recipe tagged the category
  if (parentOf(recipeTag) === memberAllergy) return true; // member allergic to the category
  return false;
}
