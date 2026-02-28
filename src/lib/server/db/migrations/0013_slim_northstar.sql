CREATE TABLE `comment_views` (
	`clip_id` text NOT NULL,
	`user_id` text NOT NULL,
	`viewed_at` integer NOT NULL,
	FOREIGN KEY (`clip_id`) REFERENCES `clips`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `comment_views_unique` ON `comment_views` (`clip_id`,`user_id`);