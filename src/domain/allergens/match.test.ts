import { describe, expect, it } from "vitest";
import { allergensMatch, parentOf } from "./taxonomy";
import { allergensForIngredient } from "./ingredient-map";
import { isBlockedByAllergens, type RecipeAllergenTag } from "./match";

describe("allergensMatch (conservative hierarchical)", () => {
  it("a recipe tagged tree_nut matches a hazelnut-only allergy (category covers specific)", () => {
    expect(allergensMatch("hazelnut", "tree_nut")).toBe(true);
  });

  it("a recipe tagged almond does NOT match a hazelnut-only allergy (sibling specifics)", () => {
    expect(allergensMatch("hazelnut", "almond")).toBe(false);
  });

  it("a member allergic to the tree_nut category is matched by a hazelnut tag", () => {
    expect(allergensMatch("tree_nut", "hazelnut")).toBe(true);
  });

  it("exact specific match", () => {
    expect(allergensMatch("macadamia", "macadamia")).toBe(true);
  });

  it("peanut is independent of tree nuts", () => {
    expect(allergensMatch("hazelnut", "peanut")).toBe(false);
    expect(parentOf("peanut")).toBeUndefined();
  });
});

describe("allergensForIngredient (import-time proposal)", () => {
  it("resolves German synonyms (Haselnuss -> hazelnut)", () => {
    const r = allergensForIngredient("Haselnuss");
    expect(r.known).toBe(true);
    expect(r.allergens).toContain("hazelnut");
  });

  it("resolves Erdnussöl -> peanut via de-umlaut normalization", () => {
    const r = allergensForIngredient("Erdnussöl");
    expect(r.known).toBe(true);
    expect(r.allergens).toContain("peanut");
  });

  it("an unmapped ingredient is unknown (uncertain), never implicitly safe", () => {
    const r = allergensForIngredient("dragonfruit");
    expect(r.known).toBe(false);
    expect(r.allergens).toEqual([]);
  });
});

describe("isBlockedByAllergens", () => {
  const tag = (
    allergen: RecipeAllergenTag["allergen"],
    contains: boolean,
    mayContainTraces: boolean,
  ): RecipeAllergenTag => ({ allergen, contains, mayContainTraces });

  it("blocks when the recipe contains a matching allergen", () => {
    expect(isBlockedByAllergens(["hazelnut"], [tag("hazelnut", true, false)])).toBe(true);
  });

  it("blocks on may_contain_traces too (precautionary)", () => {
    expect(isBlockedByAllergens(["macadamia"], [tag("macadamia", false, true)])).toBe(true);
  });

  it("blocks via category when the recipe is tagged tree_nut", () => {
    expect(isBlockedByAllergens(["hazelnut"], [tag("tree_nut", true, false)])).toBe(true);
  });

  it("does not block a sibling specific (almond) for a hazelnut allergy", () => {
    expect(isBlockedByAllergens(["hazelnut"], [tag("almond", true, false)])).toBe(false);
  });

  it("does not block when no allergen matches", () => {
    expect(isBlockedByAllergens(["hazelnut"], [tag("milk", true, true)])).toBe(false);
  });

  it("ignores tags that neither contain nor carry traces", () => {
    expect(isBlockedByAllergens(["hazelnut"], [tag("hazelnut", false, false)])).toBe(false);
  });
});
