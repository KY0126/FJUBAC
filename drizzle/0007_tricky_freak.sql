CREATE TABLE `siteDisplaySettings` (
	`id` int NOT NULL,
	`departmentCarouselIntervalMs` int NOT NULL DEFAULT 3800,
	`updatedByUserId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `siteDisplaySettings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `siteDisplaySettings` ADD CONSTRAINT `siteDisplaySettings_updatedByUserId_users_id_fk` FOREIGN KEY (`updatedByUserId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;