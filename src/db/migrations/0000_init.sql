CREATE TABLE `household` (
	`id` text PRIMARY KEY NOT NULL,
	`singleton` integer DEFAULT true NOT NULL,
	`setup_complete` integer DEFAULT false NOT NULL,
	`version` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `household_singleton_unique` ON `household` (`singleton`);--> statement-breakpoint
CREATE TABLE `ingredient` (
	`id` text PRIMARY KEY NOT NULL,
	`canonical_name` text NOT NULL,
	`synonyms` text,
	`category` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ingredient_canonical_name_unique` ON `ingredient` (`canonical_name`);--> statement-breakpoint
CREATE TABLE `ingredient_allergen` (
	`id` text PRIMARY KEY NOT NULL,
	`ingredient_id` text NOT NULL,
	`allergen` text NOT NULL,
	FOREIGN KEY (`ingredient_id`) REFERENCES `ingredient`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `member` (
	`id` text PRIMARY KEY NOT NULL,
	`household_id` text NOT NULL,
	`name` text NOT NULL,
	`birthdate` text,
	`is_eater` integer DEFAULT true NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`household_id`) REFERENCES `household`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `recipe` (
	`id` text PRIMARY KEY NOT NULL,
	`household_id` text NOT NULL,
	`title` text NOT NULL,
	`prep_minutes` integer,
	`cook_minutes` integer,
	`effort_tier` text,
	`seasons` text,
	`deconstructable` integer DEFAULT false NOT NULL,
	`kid_adaptable` integer DEFAULT false NOT NULL,
	`human_confirmed` integer DEFAULT false NOT NULL,
	`deleted_at` integer,
	`version` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`household_id`) REFERENCES `household`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `recipe_allergen` (
	`id` text PRIMARY KEY NOT NULL,
	`recipe_id` text NOT NULL,
	`allergen` text NOT NULL,
	`contains` integer DEFAULT false NOT NULL,
	`may_contain_traces` integer DEFAULT false NOT NULL,
	`human_confirmed` integer DEFAULT false NOT NULL,
	FOREIGN KEY (`recipe_id`) REFERENCES `recipe`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `recipe_ingredient` (
	`id` text PRIMARY KEY NOT NULL,
	`recipe_id` text NOT NULL,
	`ingredient_id` text NOT NULL,
	`quantity` real,
	`unit` text,
	FOREIGN KEY (`recipe_id`) REFERENCES `recipe`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`ingredient_id`) REFERENCES `ingredient`(`id`) ON UPDATE no action ON DELETE no action
);
