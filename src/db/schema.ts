import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { ALLERGEN_VALUES } from "../domain/allergens/taxonomy";

const id = () =>
  text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID());

const createdAt = () =>
  integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date());

/**
 * The single family this app serves. Not multi-tenant — exactly one row.
 * The `singleton` unique column structurally prevents a second Household.
 * `version` backs optimistic-lock writes (see src/db/optimistic-lock.ts).
 */
export const household = sqliteTable("household", {
  id: id(),
  singleton: integer("singleton", { mode: "boolean" })
    .notNull()
    .default(true)
    .unique(),
  setupComplete: integer("setup_complete", { mode: "boolean" })
    .notNull()
    .default(false),
  version: integer("version").notNull().default(0),
  createdAt: createdAt(),
});

/**
 * A person in the Household. An eater, not necessarily a login account.
 * Kids are tracked by `birthdate` (ISO date) so age-derived logic and
 * adult-equivalent scaling stay correct as they grow.
 */
export const member = sqliteTable("member", {
  id: id(),
  householdId: text("household_id")
    .notNull()
    .references(() => household.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  birthdate: text("birthdate"),
  isEater: integer("is_eater", { mode: "boolean" }).notNull().default(true),
  createdAt: createdAt(),
});

/**
 * A structured dish in the Recipe Library. `humanConfirmed` gates eligibility
 * (U12 treats unconfirmed recipes as ineligible). `deletedAt` is a soft-delete
 * tombstone so a recipe referenced by an active/approved plan is never orphaned
 * (U6). Allergen data lives in recipeAllergen, not here.
 */
export const recipe = sqliteTable("recipe", {
  id: id(),
  householdId: text("household_id")
    .notNull()
    .references(() => household.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  prepMinutes: integer("prep_minutes"),
  cookMinutes: integer("cook_minutes"),
  effortTier: text("effort_tier", {
    enum: ["express", "standard", "relaxed"],
  }),
  seasons: text("seasons", { mode: "json" }).$type<string[]>(),
  deconstructable: integer("deconstructable", { mode: "boolean" })
    .notNull()
    .default(false),
  kidAdaptable: integer("kid_adaptable", { mode: "boolean" })
    .notNull()
    .default(false),
  humanConfirmed: integer("human_confirmed", { mode: "boolean" })
    .notNull()
    .default(false),
  deletedAt: integer("deleted_at", { mode: "timestamp" }),
  version: integer("version").notNull().default(0),
  createdAt: createdAt(),
});

export const ingredient = sqliteTable("ingredient", {
  id: id(),
  canonicalName: text("canonical_name").notNull().unique(),
  synonyms: text("synonyms", { mode: "json" }).$type<string[]>(),
  // Shopping category (U18); null -> "Other" bucket so nothing is dropped.
  category: text("category"),
  createdAt: createdAt(),
});

export const recipeIngredient = sqliteTable("recipe_ingredient", {
  id: id(),
  recipeId: text("recipe_id")
    .notNull()
    .references(() => recipe.id, { onDelete: "cascade" }),
  ingredientId: text("ingredient_id")
    .notNull()
    .references(() => ingredient.id),
  // Nullable: an import may not state a quantity — return null, never guess.
  quantity: real("quantity"),
  unit: text("unit"),
});

/**
 * Human-confirmed allergen status per (recipe, allergen). `contains` and
 * `mayContainTraces` mirror EU FIC declared vs. precautionary; both hard-block
 * for an allergy (ADR-0001). This is the authoritative source the filter reads.
 */
export const recipeAllergen = sqliteTable("recipe_allergen", {
  id: id(),
  recipeId: text("recipe_id")
    .notNull()
    .references(() => recipe.id, { onDelete: "cascade" }),
  allergen: text("allergen", { enum: ALLERGEN_VALUES }).notNull(),
  contains: integer("contains", { mode: "boolean" }).notNull().default(false),
  mayContainTraces: integer("may_contain_traces", { mode: "boolean" })
    .notNull()
    .default(false),
  humanConfirmed: integer("human_confirmed", { mode: "boolean" })
    .notNull()
    .default(false),
});

/** Seeded read-only reference: canonical ingredient -> allergen. Import-time
 *  proposal only (never read by the planner/filter). */
export const ingredientAllergen = sqliteTable("ingredient_allergen", {
  id: id(),
  ingredientId: text("ingredient_id")
    .notNull()
    .references(() => ingredient.id, { onDelete: "cascade" }),
  allergen: text("allergen", { enum: ALLERGEN_VALUES }).notNull(),
});

export type Household = typeof household.$inferSelect;
export type NewHousehold = typeof household.$inferInsert;
export type Member = typeof member.$inferSelect;
export type NewMember = typeof member.$inferInsert;
export type Recipe = typeof recipe.$inferSelect;
export type NewRecipe = typeof recipe.$inferInsert;
export type Ingredient = typeof ingredient.$inferSelect;
export type RecipeAllergen = typeof recipeAllergen.$inferSelect;
export type NewRecipeAllergen = typeof recipeAllergen.$inferInsert;
