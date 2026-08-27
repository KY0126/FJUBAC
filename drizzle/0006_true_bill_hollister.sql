CREATE TABLE `projectDeliverables` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`taskId` int,
	`resourceId` int,
	`title` varchar(200) NOT NULL,
	`description` text,
	`status` enum('draft','submitted','accepted','archived') NOT NULL DEFAULT 'draft',
	`submittedByUserId` int,
	`submittedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `projectDeliverables_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `projectMilestones` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`title` varchar(200) NOT NULL,
	`description` text,
	`dueAt` timestamp,
	`status` enum('planned','in_progress','completed','archived') NOT NULL DEFAULT 'planned',
	`sortOrder` int NOT NULL DEFAULT 0,
	`createdByUserId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `projectMilestones_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `projectTasks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`milestoneId` int,
	`title` varchar(200) NOT NULL,
	`description` text,
	`assigneeUserId` int,
	`status` enum('todo','in_progress','blocked','completed','cancelled') NOT NULL DEFAULT 'todo',
	`priority` enum('low','normal','high') NOT NULL DEFAULT 'normal',
	`dueAt` timestamp,
	`completedAt` timestamp,
	`sortOrder` int NOT NULL DEFAULT 0,
	`createdByUserId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `projectTasks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `resources` ADD `supersedesResourceId` int;--> statement-breakpoint
ALTER TABLE `projectDeliverables` ADD CONSTRAINT `projectDeliverables_projectId_projects_id_fk` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `projectDeliverables` ADD CONSTRAINT `projectDeliverables_taskId_projectTasks_id_fk` FOREIGN KEY (`taskId`) REFERENCES `projectTasks`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `projectDeliverables` ADD CONSTRAINT `projectDeliverables_resourceId_resources_id_fk` FOREIGN KEY (`resourceId`) REFERENCES `resources`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `projectDeliverables` ADD CONSTRAINT `projectDeliverables_submittedByUserId_users_id_fk` FOREIGN KEY (`submittedByUserId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `projectMilestones` ADD CONSTRAINT `projectMilestones_projectId_projects_id_fk` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `projectMilestones` ADD CONSTRAINT `projectMilestones_createdByUserId_users_id_fk` FOREIGN KEY (`createdByUserId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `projectTasks` ADD CONSTRAINT `projectTasks_projectId_projects_id_fk` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `projectTasks` ADD CONSTRAINT `projectTasks_milestoneId_projectMilestones_id_fk` FOREIGN KEY (`milestoneId`) REFERENCES `projectMilestones`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `projectTasks` ADD CONSTRAINT `projectTasks_assigneeUserId_users_id_fk` FOREIGN KEY (`assigneeUserId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `projectTasks` ADD CONSTRAINT `projectTasks_createdByUserId_users_id_fk` FOREIGN KEY (`createdByUserId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `project_deliverables_project_status_idx` ON `projectDeliverables` (`projectId`,`status`);--> statement-breakpoint
CREATE INDEX `project_deliverables_task_idx` ON `projectDeliverables` (`taskId`);--> statement-breakpoint
CREATE INDEX `project_deliverables_resource_idx` ON `projectDeliverables` (`resourceId`);--> statement-breakpoint
CREATE INDEX `project_milestones_project_status_idx` ON `projectMilestones` (`projectId`,`status`);--> statement-breakpoint
CREATE INDEX `project_milestones_due_idx` ON `projectMilestones` (`projectId`,`dueAt`);--> statement-breakpoint
CREATE INDEX `project_tasks_project_status_idx` ON `projectTasks` (`projectId`,`status`);--> statement-breakpoint
CREATE INDEX `project_tasks_assignee_status_idx` ON `projectTasks` (`assigneeUserId`,`status`);--> statement-breakpoint
CREATE INDEX `project_tasks_milestone_idx` ON `projectTasks` (`milestoneId`);--> statement-breakpoint
ALTER TABLE `resources` ADD CONSTRAINT `resources_supersedesResourceId_resources_id_fk` FOREIGN KEY (`supersedesResourceId`) REFERENCES `resources`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `resources_supersedes_idx` ON `resources` (`supersedesResourceId`);