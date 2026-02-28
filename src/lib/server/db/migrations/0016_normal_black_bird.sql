ALTER TABLE `groups` ADD `platform_filter_mode` text DEFAULT 'all' NOT NULL;--> statement-breakpoint
ALTER TABLE `groups` ADD `platform_filter_list` text;