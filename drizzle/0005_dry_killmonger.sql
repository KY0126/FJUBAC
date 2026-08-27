CREATE TABLE `personalNotifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`title` varchar(200) NOT NULL,
	`body` text,
	`href` varchar(500),
	`category` enum('system','account','activity','project','recruitment') NOT NULL DEFAULT 'system',
	`readAt` timestamp,
	`archivedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `personalNotifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `resourceFavorites` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`resourceId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `resourceFavorites_id` PRIMARY KEY(`id`),
	CONSTRAINT `resource_favorites_user_resource_unique` UNIQUE(`userId`,`resourceId`)
);
--> statement-breakpoint
ALTER TABLE `personalNotifications` ADD CONSTRAINT `personalNotifications_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `resourceFavorites` ADD CONSTRAINT `resourceFavorites_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `resourceFavorites` ADD CONSTRAINT `resourceFavorites_resourceId_resources_id_fk` FOREIGN KEY (`resourceId`) REFERENCES `resources`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `personal_notifications_user_active_idx` ON `personalNotifications` (`userId`,`archivedAt`,`createdAt`);--> statement-breakpoint
CREATE INDEX `resource_favorites_user_created_idx` ON `resourceFavorites` (`userId`,`createdAt`);