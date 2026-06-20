import {
  pgTable,
  pgEnum,
  uuid,
  text,
  date,
  boolean,
  integer,
  real,
  timestamp,
} from "drizzle-orm/pg-core";
import { ALLERGEN_VALUES } from "../domain/allergens/taxonomy";

export const effortTierEnum = pgEnum("effort_tier", [
  "express",
  "standard",
  "relaxed",
]);
export const allergenEnum = pgEnum("allergen", ALLERGEN_VALUES);

/**
 * The single family this app serves. Not multi-tenant — exactly one row.
 * The `singleton` unique column structurally prevents a second Household.
 * `version` backs optimistic-lock writes (see src/db/optimistic-lock.ts).
 */
export const household = pgTable("household", {
  id: uuid("id").primaryKey().defaultRandom(),
  singleton: boolean("singleton").notNull().default(true).unique(),
  setupComplete: boolean("setup_complete").notNull().default(false),
  version: integer("version").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/**
 * A person in the Household. An eater, not necessarily a login account.
 * Kids are tracked by `birthdate` so age-derived logic and adult-equivalent
 * scaling stay correct as they grow.
 */
export const member = pgTable("member", {
  id: uuid("id").primaryKey().defaultRandom(),
  householdId: uuid("household_id")
    .notNull()
    .references(() => household.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  birthdate: date("birthdate"),
  isEater: boolean("is_eater").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/**
 * A structured dish in the Recipe Library. `humanConfirmed` gates eligibility
 * (U12 treats unconfirmed recipes as ineligible). `deletedAt` is a soft-delete
 * tombstone so a recipe referenced by an active/approved plan is never orphaned
 * (U6). Allergen data lives in recipeAllergen, not here.
 */
export const recipe = pgTable("recipe", {
  id: uuid("id").primaryKey().defaultRandom(),
  householdId: uuid("household_id")
    .notNull()
    .references(() => household.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  prepMinutes: integer("prep_minutes"),
  cookMinutes: integer("cook_minutes"),
  effortTier: effortTierEnum("effort_tier"),
  seasons: text("seasons").array(),
  deconstructable: boolean("deconstructable").notNull().default(false),
  kidAdaptable: boolean("kid_adaptable").notNull().default(false),
  humanConfirmed: boolean("human_confirmed").notNull().default(false),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
  version: integer("version").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const ingredient = pgTable("ingredient", {
  id: uuid("id").primaryKey().defaultRandom(),
  canonicalName: text("canonical_name").notNull().unique(),
  synonyms: text("synonyms").array(),
  // Shopping category (U18); null -> "Other" bucket so nothing is dropped.
  category: text("category"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const recipeIngredient = pgTable("recipe_ingredient", {
  id: uuid("id").primaryKey().defaultRandom(),
  recipeId: uuid("recipe_id")
    .notNull()
    .references(() => recipe.id, { onDelete: "cascade" }),
  ingredientId: uuid("ingredient_id")
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
export const recipeAllergen = pgTable("recipe_allergen", {
  id: uuid("id").primaryKey().defaultRandom(),
  recipeId: uuid("recipe_id")
    .notNull()
    .references(() => recipe.id, { onDelete: "cascade" }),
  allergen: allergenEnum("allergen").notNull(),
  contains: boolean("contains").notNull().default(false),
  mayContainTraces: boolean("may_contain_traces").notNull().default(false),
  humanConfirmed: boolean("human_confirmed").notNull().default(false),
});

/** Seeded read-only reference: canonical ingredient -> allergen. Import-time
 *  proposal only (never read by the planner/filter). */
export const ingredientAllergen = pgTable("ingredient_allergen", {
  id: uuid("id").primaryKey().defaultRandom(),
  ingredientId: uuid("ingredient_id")
    .notNull()
    .references(() => ingredient.id, { onDelete: "cascade" }),
  allergen: allergenEnum("allergen").notNull(),
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
