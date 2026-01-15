PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_users` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	`email` text NOT NULL,
	`password_hash` text,
	`is_email_verified` integer DEFAULT false NOT NULL,
	`email_verified_at` integer,
	`oauth_provider` text,
	`oauth_provider_id` text,
	`picture` text,
	`last_login_at` integer,
	`last_login_method` text,
	`has_completed_onboarding` integer DEFAULT false NOT NULL,
	`first_name` text,
	`last_name` text,
	`date_of_birth` integer,
	`phone` text,
	`address` text,
	`city` text,
	`state` text,
	`country` text,
	`postal_code` text,
	`role` text DEFAULT 'user' NOT NULL,
	`is_active` integer DEFAULT true NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_users`("id", "created_at", "updated_at", "deleted_at", "email", "password_hash", "is_email_verified", "email_verified_at", "oauth_provider", "oauth_provider_id", "picture", "last_login_at", "last_login_method", "has_completed_onboarding", "first_name", "last_name", "date_of_birth", "phone", "address", "city", "state", "country", "postal_code", "role", "is_active") SELECT "id", "created_at", "updated_at", "deleted_at", "email", "password_hash", "is_email_verified", "email_verified_at", "oauth_provider", "oauth_provider_id", "picture", "last_login_at", "last_login_method", "has_completed_onboarding", "first_name", "last_name", "date_of_birth", "phone", "address", "city", "state", "country", "postal_code", "role", "is_active" FROM `users`;--> statement-breakpoint
DROP TABLE `users`;--> statement-breakpoint
ALTER TABLE `__new_users` RENAME TO `users`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `users_email_idx` ON `users` (`email`);--> statement-breakpoint
CREATE INDEX `users_oauth_idx` ON `users` (`oauth_provider`,`oauth_provider_id`);--> statement-breakpoint
CREATE INDEX `users_role_idx` ON `users` (`role`);--> statement-breakpoint
CREATE INDEX `users_active_idx` ON `users` (`is_active`);--> statement-breakpoint
CREATE INDEX `users_deleted_idx` ON `users` (`deleted_at`);--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);--> statement-breakpoint
CREATE UNIQUE INDEX `users_oauth_unique` ON `users` (`oauth_provider`,`oauth_provider_id`);