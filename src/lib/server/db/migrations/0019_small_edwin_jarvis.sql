ALTER TABLE `groups` ADD `shortcut_token` text;--> statement-breakpoint
ALTER TABLE `groups` ADD `shortcut_url` text;--> statement-breakpoint
CREATE UNIQUE INDEX `groups_shortcut_token_unique` ON `groups` (`shortcut_token`);