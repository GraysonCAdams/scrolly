ALTER TABLE `notification_preferences` ADD `mentions` integer DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `groups` DROP COLUMN `max_duration_seconds`;