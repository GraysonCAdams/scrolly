ALTER TABLE `clips` ADD `content_type` text DEFAULT 'video' NOT NULL;--> statement-breakpoint
ALTER TABLE `clips` ADD `audio_path` text;--> statement-breakpoint
ALTER TABLE `clips` ADD `artist` text;--> statement-breakpoint
ALTER TABLE `clips` ADD `album_art` text;--> statement-breakpoint
ALTER TABLE `clips` ADD `spotify_url` text;--> statement-breakpoint
ALTER TABLE `clips` ADD `apple_music_url` text;--> statement-breakpoint
ALTER TABLE `clips` ADD `youtube_music_url` text;