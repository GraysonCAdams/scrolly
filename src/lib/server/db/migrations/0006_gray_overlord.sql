DELETE FROM watched WHERE rowid NOT IN (
  SELECT MAX(rowid) FROM watched GROUP BY clip_id, user_id
);--> statement-breakpoint
ALTER TABLE `watched` ADD `watch_percent` integer;--> statement-breakpoint
CREATE UNIQUE INDEX `watched_clip_user` ON `watched` (`clip_id`,`user_id`);