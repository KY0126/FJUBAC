ALTER TABLE `announcements` ADD `category` enum('general','recruitment','event','academic','external','governance') DEFAULT 'general' NOT NULL;--> statement-breakpoint
ALTER TABLE `announcements` ADD `coverImageUrl` varchar(500);--> statement-breakpoint
ALTER TABLE `projects` ADD `isPublic` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `projects` ADD `publicSummary` text;--> statement-breakpoint
ALTER TABLE `projects` ADD `publicCoverImageUrl` varchar(500);--> statement-breakpoint
ALTER TABLE `projects` ADD `publicConsentRecordedAt` timestamp;--> statement-breakpoint
ALTER TABLE `resources` ADD `publicConsentRecordedAt` timestamp;--> statement-breakpoint
CREATE INDEX `announcements_category_idx` ON `announcements` (`category`,`publishedAt`);--> statement-breakpoint
CREATE INDEX `projects_public_idx` ON `projects` (`isPublic`,`status`);--> statement-breakpoint
CREATE INDEX `resources_public_idx` ON `resources` (`visibility`,`publicConsentRecordedAt`);