import type { Allergen } from "./taxonomy";

/**
 * Canonical ingredient → allergen mapping with synonyms (incl. German). This
 * is used ONLY at import / manual-entry time to PROPOSE initial allergen tags
 * for mandatory human confirmation (U6/U7/U8). It is never read by the planner,
 * eligibility filter, or re-validation — those read the human-confirmed
 * recipe_allergen rows. A missing ingredient yields `known: false`
 * (uncertain), never an implicit "safe".
 */
const INGREDIENT_ALLERGENS: Record<string, Allergen[]> = {
  // tree nuts (specific)
  hazelnut: ["hazelnut"],
  haselnuss: ["hazelnut"],
  macadamia: ["macadamia"],
  almond: ["almond"],
  mandel: ["almond"],
  walnut: ["walnut"],
  walnuss: ["walnut"],
  cashew: ["cashew"],
  pecan: ["pecan"],
  pistachio: ["pistachio"],
  pistazie: ["pistachio"],
  // peanut (legume, NOT a tree nut)
  peanut: ["peanut"],
  erdnuss: ["peanut"],
  erdnussoel: ["peanut"],
  groundnut: ["peanut"],
  arachide: ["peanut"],
  // milk
  milk: ["milk"],
  milch: ["milk"],
  butter: ["milk"],
  cream: ["milk"],
  sahne: ["milk"],
  cheese: ["milk"],
  kaese: ["milk"],
  yogurt: ["milk"],
  joghurt: ["milk"],
  // egg
  egg: ["egg"],
  ei: ["egg"],
  // gluten
  wheat: ["gluten"],
  weizen: ["gluten"],
  flour: ["gluten"],
  mehl: ["gluten"],
  barley: ["gluten"],
  gerste: ["gluten"],
  // soy
  soy: ["soy"],
  soja: ["soy"],
  tofu: ["soy"],
  // sesame
  sesame: ["sesame"],
  sesam: ["sesame"],
  tahini: ["sesame"],
  // fish / shellfish
  fish: ["fish"],
  fisch: ["fish"],
  salmon: ["fish"],
  lachs: ["fish"],
  shrimp: ["crustaceans"],
  garnele: ["crustaceans"],
  // others
  celery: ["celery"],
  sellerie: ["celery"],
  mustard: ["mustard"],
  senf: ["mustard"],
};

/** Normalize an ingredient name for lookup: lowercase, de-umlaut, strip. */
export function normalizeIngredient(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/ö/g, "oe")
    .replace(/ä/g, "ae")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .replace(/[^a-z0-9]/g, "");
}

/**
 * Propose allergens for an ingredient name. `known: false` means the
 * ingredient is not in the map — the caller must treat it as uncertain and
 * surface it for human review, never assume it is allergen-free.
 */
export function allergensForIngredient(name: string): {
  allergens: Allergen[];
  known: boolean;
} {
  const hit = INGREDIENT_ALLERGENS[normalizeIngredient(name)];
  if (hit) return { allergens: hit, known: true };
  return { allergens: [], known: false };
}
