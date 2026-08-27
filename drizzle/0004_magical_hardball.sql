CREATE TABLE `resourceAccessLogs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`resourceId` int NOT NULL,
	`action` enum('view','download') NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `resourceAccessLogs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `userPreferences` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`reducedMotion` boolean NOT NULL DEFAULT false,
	`inAppNotifications` boolean NOT NULL DEFAULT true,
	`emailNotifications` boolean NOT NULL DEFAULT false,
	`resourceHistoryVisible` boolean NOT NULL DEFAULT true,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `userPreferences_id` PRIMARY KEY(`id`),
	CONSTRAINT `user_preferences_user_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
ALTER TABLE `users` ADD `avatarStorageKey` varchar(500);--> statement-breakpoint
ALTER TABLE `users` ADD `avatarUrl` varchar(500);--> statement-breakpoint
ALTER TABLE `users` ADD `grade` varchar(80);--> statement-breakpoint
ALTER TABLE `users` ADD `contact` varchar(120);--> statement-breakpoint
ALTER TABLE `users` ADD `lastPasswordChangedAt` timestamp;--> statement-breakpoint
ALTER TABLE `resourceAccessLogs` ADD CONSTRAINT `resourceAccessLogs_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `resourceAccessLogs` ADD CONSTRAINT `resourceAccessLogs_resourceId_resources_id_fk` FOREIGN KEY (`resourceId`) REFERENCES `resources`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `userPreferences` ADD CONSTRAINT `userPreferences_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `resource_access_logs_user_created_idx` ON `resourceAccessLogs` (`userId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `resource_access_logs_resource_idx` ON `resourceAccessLogs` (`resourceId`,`createdAt`);