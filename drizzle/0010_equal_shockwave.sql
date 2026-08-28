CREATE TABLE `learningCareerResourceMappings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`resourceId` int NOT NULL,
	`category` enum('club_activities','workshops','corporate_visits','career_preparation') NOT NULL,
	`displayOrder` int NOT NULL DEFAULT 0,
	`createdByUserId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `learningCareerResourceMappings_id` PRIMARY KEY(`id`),
	CONSTRAINT `learning_career_resource_unique` UNIQUE(`resourceId`)
);
--> statement-breakpoint
ALTER TABLE `learningCareerResourceMappings` ADD CONSTRAINT `learningCareerResourceMappings_resourceId_resources_id_fk` FOREIGN KEY (`resourceId`) REFERENCES `resources`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `learningCareerResourceMappings` ADD CONSTRAINT `learningCareerResourceMappings_createdByUserId_users_id_fk` FOREIGN KEY (`createdByUserId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `learning_career_resource_category_order_idx` ON `learningCareerResourceMappings` (`category`,`displayOrder`);