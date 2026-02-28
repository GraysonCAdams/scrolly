CREATE TABLE `verification_codes` (
	`id` text PRIMARY KEY NOT NULL,
	`phone` text NOT NULL,
	`code` text NOT NULL,
	`user_id` text NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`expires_at` integer NOT NULL,
	`verified_at` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
