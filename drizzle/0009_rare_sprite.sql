CREATE TABLE `projectStageDocuments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`stage` enum('methodology','framing','industry','qualitative','quantitative','synthesis','mvp','impact') NOT NULL,
	`resourceId` int,
	`deliverableId` int,
	`title` varchar(200) NOT NULL,
	`summary` text,
	`status` enum('active','locked','archived') NOT NULL DEFAULT 'active',
	`createdByUserId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `projectStageDocuments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `projectWorkflowStates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`currentStage` enum('methodology','framing','industry','qualitative','quantitative','synthesis','mvp','impact') NOT NULL DEFAULT 'methodology',
	`updatedByUserId` int,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `projectWorkflowStates_id` PRIMARY KEY(`id`),
	CONSTRAINT `project_workflow_states_project_unique` UNIQUE(`projectId`)
);
--> statement-breakpoint
CREATE TABLE `projectWorkflowTransitions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`fromStage` enum('methodology','framing','industry','qualitative','quantitative','synthesis','mvp','impact'),
	`toStage` enum('methodology','framing','industry','qualitative','quantitative','synthesis','mvp','impact') NOT NULL,
	`direction` enum('forward','rollback') NOT NULL,
	`reason` varchar(500),
	`changedByUserId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `projectWorkflowTransitions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `projectStageDocuments` ADD CONSTRAINT `projectStageDocuments_projectId_projects_id_fk` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `projectStageDocuments` ADD CONSTRAINT `projectStageDocuments_resourceId_resources_id_fk` FOREIGN KEY (`resourceId`) REFERENCES `resources`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `projectStageDocuments` ADD CONSTRAINT `projectStageDocuments_deliverableId_projectDeliverables_id_fk` FOREIGN KEY (`deliverableId`) REFERENCES `projectDeliverables`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `projectStageDocuments` ADD CONSTRAINT `projectStageDocuments_createdByUserId_users_id_fk` FOREIGN KEY (`createdByUserId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `projectWorkflowStates` ADD CONSTRAINT `projectWorkflowStates_projectId_projects_id_fk` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `projectWorkflowStates` ADD CONSTRAINT `projectWorkflowStates_updatedByUserId_users_id_fk` FOREIGN KEY (`updatedByUserId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `projectWorkflowTransitions` ADD CONSTRAINT `projectWorkflowTransitions_projectId_projects_id_fk` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `projectWorkflowTransitions` ADD CONSTRAINT `projectWorkflowTransitions_changedByUserId_users_id_fk` FOREIGN KEY (`changedByUserId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `project_stage_documents_project_stage_idx` ON `projectStageDocuments` (`projectId`,`stage`,`status`);--> statement-breakpoint
CREATE INDEX `project_workflow_transitions_project_created_idx` ON `projectWorkflowTransitions` (`projectId`,`createdAt`);