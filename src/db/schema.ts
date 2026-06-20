import {
  pgTable,
  uuid,
  text,
  date,
  boolean,
  integer,
  timestamp,
} from "drizzle-orm/pg-core";

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

export type Household = typeof household.$inferSelect;
export type NewHousehold = typeof household.$inferInsert;
export type Member = typeof member.$inferSelect;
export type NewMember = typeof member.$inferInsert;
