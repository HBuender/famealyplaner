CREATE TYPE "public"."allergen" AS ENUM('gluten', 'crustaceans', 'egg', 'fish', 'peanut', 'soy', 'milk', 'tree_nut', 'celery', 'mustard', 'sesame', 'sulphite', 'lupin', 'mollusc', 'almond', 'hazelnut', 'walnut', 'cashew', 'pecan', 'brazil_nut', 'pistachio', 'macadamia');--> statement-breakpoint
CREATE TYPE "public"."effort_tier" AS ENUM('express', 'standard', 'relaxed');--> statement-breakpoint
CREATE TABLE "ingredient" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"canonical_name" text NOT NULL,
	"synonyms" text[],
	"category" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ingredient_canonical_name_unique" UNIQUE("canonical_name")
);
--> statement-breakpoint
CREATE TABLE "ingredient_allergen" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ingredient_id" uuid NOT NULL,
	"allergen" "allergen" NOT NULL
);
--> statement-breakpoint
CREATE TABLE "recipe" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"household_id" uuid NOT NULL,
	"title" text NOT NULL,
	"prep_minutes" integer,
	"cook_minutes" integer,
	"effort_tier" "effort_tier",
	"seasons" text[],
	"deconstructable" boolean DEFAULT false NOT NULL,
	"kid_adaptable" boolean DEFAULT false NOT NULL,
	"human_confirmed" boolean DEFAULT false NOT NULL,
	"deleted_at" timestamp with time zone,
	"version" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "recipe_allergen" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"recipe_id" uuid NOT NULL,
	"allergen" "allergen" NOT NULL,
	"contains" boolean DEFAULT false NOT NULL,
	"may_contain_traces" boolean DEFAULT false NOT NULL,
	"human_confirmed" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "recipe_ingredient" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"recipe_id" uuid NOT NULL,
	"ingredient_id" uuid NOT NULL,
	"quantity" real,
	"unit" text
);
--> statement-breakpoint
ALTER TABLE "ingredient_allergen" ADD CONSTRAINT "ingredient_allergen_ingredient_id_ingredient_id_fk" FOREIGN KEY ("ingredient_id") REFERENCES "public"."ingredient"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipe" ADD CONSTRAINT "recipe_household_id_household_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."household"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipe_allergen" ADD CONSTRAINT "recipe_allergen_recipe_id_recipe_id_fk" FOREIGN KEY ("recipe_id") REFERENCES "public"."recipe"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipe_ingredient" ADD CONSTRAINT "recipe_ingredient_recipe_id_recipe_id_fk" FOREIGN KEY ("recipe_id") REFERENCES "public"."recipe"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipe_ingredient" ADD CONSTRAINT "recipe_ingredient_ingredient_id_ingredient_id_fk" FOREIGN KEY ("ingredient_id") REFERENCES "public"."ingredient"("id") ON DELETE no action ON UPDATE no action;