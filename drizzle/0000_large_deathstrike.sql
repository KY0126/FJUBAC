CREATE TABLE `applicationReviews` (
	`id` int AUTO_INCREMENT NOT NULL,
	`applicationId` int NOT NULL,
	`stage` enum('document','interview') NOT NULL,
	`reviewerUserId` int NOT NULL,
	`result` enum('pass','return','fail','waitlist','recommend') NOT NULL,
	`comment` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `applicationReviews_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `auditLogs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`actorUserId` int,
	`action` varchar(160) NOT NULL,
	`targetType` varchar(100) NOT NULL,
	`targetId` int,
	`beforeData` json,
	`afterData` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `auditLogs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `departments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`code` varchar(40) NOT NULL,
	`name` varchar(120) NOT NULL,
	`englishName` varchar(160) NOT NULL,
	`description` text,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `departments_id` PRIMARY KEY(`id`),
	CONSTRAINT `departments_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `eventRegistrations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`eventId` int NOT NULL,
	`userId` int NOT NULL,
	`status` enum('registered','waitlisted','cancelled','attended','absent') NOT NULL DEFAULT 'registered',
	`waitlistPosition` int,
	`registeredAt` timestamp NOT NULL DEFAULT (now()),
	`cancelledAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `eventRegistrations_id` PRIMARY KEY(`id`),
	CONSTRAINT `event_registrations_unique` UNIQUE(`eventId`,`userId`)
);
--> statement-breakpoint
CREATE TABLE `events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(200) NOT NULL,
	`summary` text,
	`startsAt` timestamp NOT NULL,
	`endsAt` timestamp NOT NULL,
	`registrationDeadlineAt` timestamp,
	`location` varchar(240),
	`capacity` int NOT NULL DEFAULT 0,
	`visibility` enum('public','member','project','officer') NOT NULL DEFAULT 'member',
	`projectId` int,
	`status` enum('draft','published','open','full','closed','cancelled','completed') NOT NULL DEFAULT 'draft',
	`createdByUserId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `interviewSchedules` (
	`id` int AUTO_INCREMENT NOT NULL,
	`applicationId` int NOT NULL,
	`startsAt` timestamp NOT NULL,
	`endsAt` timestamp NOT NULL,
	`format` enum('online','in_person') NOT NULL,
	`locationOrLink` varchar(500),
	`status` enum('scheduled','completed','cancelled','no_show') NOT NULL DEFAULT 'scheduled',
	`createdByUserId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `interviewSchedules_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `membershipApplications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`cycleId` int NOT NULL,
	`applicantType` enum('internal','external') NOT NULL,
	`applicantName` varchar(120) NOT NULL,
	`studentNumber` varchar(32),
	`schoolEmail` varchar(320),
	`externalEmail` varchar(320),
	`grade` varchar(80) NOT NULL,
	`contact` varchar(120) NOT NULL,
	`motivation` text NOT NULL,
	`status` enum('submitted','document_review','returned','interview_scheduled','interview_completed','approved','waitlisted','rejected','activation_pending','withdrawn','expired') NOT NULL DEFAULT 'submitted',
	`finalDecisionNote` text,
	`finalizedByUserId` int,
	`finalizedAt` timestamp,
	`accountUserId` int,
	`submittedAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `membershipApplications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `memberships` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`status` enum('active','inactive','alumni') NOT NULL DEFAULT 'active',
	`cohort` varchar(40),
	`joinedAt` timestamp NOT NULL DEFAULT (now()),
	`endedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `memberships_id` PRIMARY KEY(`id`),
	CONSTRAINT `memberships_user_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
CREATE TABLE `officerAssignments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`departmentId` int NOT NULL,
	`title` varchar(120) NOT NULL,
	`permissionGroup` varchar(80) NOT NULL,
	`startsOn` timestamp NOT NULL,
	`endsOn` timestamp NOT NULL,
	`status` enum('active','ended','revoked') NOT NULL DEFAULT 'active',
	`reminder30SentAt` timestamp,
	`reminder7SentAt` timestamp,
	`revokedAt` timestamp,
	`revocationReason` varchar(255),
	`createdByUserId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `officerAssignments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `projectAssignments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`userId` int NOT NULL,
	`projectRole` enum('project_member','project_lead','advisor') NOT NULL DEFAULT 'project_member',
	`startsAt` timestamp NOT NULL DEFAULT (now()),
	`endsAt` timestamp,
	`status` enum('active','ended','removed') NOT NULL DEFAULT 'active',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `projectAssignments_id` PRIMARY KEY(`id`),
	CONSTRAINT `project_assignments_unique` UNIQUE(`projectId`,`userId`)
);
--> statement-breakpoint
CREATE TABLE `projects` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(200) NOT NULL,
	`description` text,
	`departmentId` int,
	`status` enum('draft','active','completed','archived','cancelled') NOT NULL DEFAULT 'draft',
	`startsAt` timestamp,
	`endsAt` timestamp,
	`createdByUserId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `projects_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `recruitmentCycles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`audienceType` enum('internal','external') NOT NULL,
	`title` varchar(160) NOT NULL,
	`description` text NOT NULL,
	`opensAt` timestamp NOT NULL,
	`documentDeadlineAt` timestamp NOT NULL,
	`interviewStartsAt` timestamp,
	`resultAnnouncedAt` timestamp,
	`status` enum('draft','open','closed','archived') NOT NULL DEFAULT 'draft',
	`createdByUserId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `recruitmentCycles_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `resources` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(200) NOT NULL,
	`description` text,
	`storageKey` varchar(500) NOT NULL,
	`fileName` varchar(255) NOT NULL,
	`mimeType` varchar(120),
	`visibility` enum('public','member','project','officer') NOT NULL DEFAULT 'member',
	`projectId` int,
	`departmentId` int,
	`versionLabel` varchar(80),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`createdByUserId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `resources_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` int AUTO_INCREMENT NOT NULL,
	`openId` varchar(128) NOT NULL,
	`name` text,
	`email` varchar(320),
	`loginMethod` varchar(64),
	`role` enum('user','admin') NOT NULL DEFAULT 'user',
	`accountType` enum('internal','external','oauth'),
	`studentNumber` varchar(32),
	`passwordHash` varchar(255),
	`accountStatus` enum('pending_activation','active','inactive') NOT NULL DEFAULT 'pending_activation',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`lastSignedIn` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_openId_unique` UNIQUE(`openId`),
	CONSTRAINT `users_email_unique` UNIQUE(`email`),
	CONSTRAINT `users_student_number_unique` UNIQUE(`studentNumber`)
);
--> statement-breakpoint
CREATE TABLE `verificationCodes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`email` varchar(320) NOT NULL,
	`purpose` enum('activation','password_reset') NOT NULL,
	`codeHash` varchar(255) NOT NULL,
	`attempts` int NOT NULL DEFAULT 0,
	`maxAttempts` int NOT NULL DEFAULT 5,
	`expiresAt` timestamp NOT NULL,
	`consumedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `verificationCodes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `applicationReviews` ADD CONSTRAINT `applicationReviews_applicationId_membershipApplications_id_fk` FOREIGN KEY (`applicationId`) REFERENCES `membershipApplications`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `applicationReviews` ADD CONSTRAINT `applicationReviews_reviewerUserId_users_id_fk` FOREIGN KEY (`reviewerUserId`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `auditLogs` ADD CONSTRAINT `auditLogs_actorUserId_users_id_fk` FOREIGN KEY (`actorUserId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `eventRegistrations` ADD CONSTRAINT `eventRegistrations_eventId_events_id_fk` FOREIGN KEY (`eventId`) REFERENCES `events`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `eventRegistrations` ADD CONSTRAINT `eventRegistrations_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `events` ADD CONSTRAINT `events_projectId_projects_id_fk` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `events` ADD CONSTRAINT `events_createdByUserId_users_id_fk` FOREIGN KEY (`createdByUserId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `interviewSchedules` ADD CONSTRAINT `interviewSchedules_applicationId_membershipApplications_id_fk` FOREIGN KEY (`applicationId`) REFERENCES `membershipApplications`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `interviewSchedules` ADD CONSTRAINT `interviewSchedules_createdByUserId_users_id_fk` FOREIGN KEY (`createdByUserId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `membershipApplications` ADD CONSTRAINT `membershipApplications_cycleId_recruitmentCycles_id_fk` FOREIGN KEY (`cycleId`) REFERENCES `recruitmentCycles`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `membershipApplications` ADD CONSTRAINT `membershipApplications_finalizedByUserId_users_id_fk` FOREIGN KEY (`finalizedByUserId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `membershipApplications` ADD CONSTRAINT `membershipApplications_accountUserId_users_id_fk` FOREIGN KEY (`accountUserId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `memberships` ADD CONSTRAINT `memberships_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `officerAssignments` ADD CONSTRAINT `officerAssignments_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `officerAssignments` ADD CONSTRAINT `officerAssignments_departmentId_departments_id_fk` FOREIGN KEY (`departmentId`) REFERENCES `departments`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `officerAssignments` ADD CONSTRAINT `officerAssignments_createdByUserId_users_id_fk` FOREIGN KEY (`createdByUserId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `projectAssignments` ADD CONSTRAINT `projectAssignments_projectId_projects_id_fk` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `projectAssignments` ADD CONSTRAINT `projectAssignments_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `projects` ADD CONSTRAINT `projects_departmentId_departments_id_fk` FOREIGN KEY (`departmentId`) REFERENCES `departments`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `projects` ADD CONSTRAINT `projects_createdByUserId_users_id_fk` FOREIGN KEY (`createdByUserId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `recruitmentCycles` ADD CONSTRAINT `recruitmentCycles_createdByUserId_users_id_fk` FOREIGN KEY (`createdByUserId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `resources` ADD CONSTRAINT `resources_projectId_projects_id_fk` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `resources` ADD CONSTRAINT `resources_departmentId_departments_id_fk` FOREIGN KEY (`departmentId`) REFERENCES `departments`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `resources` ADD CONSTRAINT `resources_createdByUserId_users_id_fk` FOREIGN KEY (`createdByUserId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `verificationCodes` ADD CONSTRAINT `verificationCodes_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `application_reviews_application_idx` ON `applicationReviews` (`applicationId`,`stage`);--> statement-breakpoint
CREATE INDEX `audit_logs_target_idx` ON `auditLogs` (`targetType`,`targetId`);--> statement-breakpoint
CREATE INDEX `audit_logs_actor_idx` ON `auditLogs` (`actorUserId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `departments_active_idx` ON `departments` (`isActive`);--> statement-breakpoint
CREATE INDEX `event_registrations_status_idx` ON `eventRegistrations` (`eventId`,`status`);--> statement-breakpoint
CREATE INDEX `events_status_start_idx` ON `events` (`status`,`startsAt`);--> statement-breakpoint
CREATE INDEX `events_visibility_idx` ON `events` (`visibility`);--> statement-breakpoint
CREATE INDEX `interviews_application_idx` ON `interviewSchedules` (`applicationId`,`status`);--> statement-breakpoint
CREATE INDEX `applications_cycle_status_idx` ON `membershipApplications` (`cycleId`,`status`);--> statement-breakpoint
CREATE INDEX `applications_email_idx` ON `membershipApplications` (`schoolEmail`);--> statement-breakpoint
CREATE INDEX `applications_external_email_idx` ON `membershipApplications` (`externalEmail`);--> statement-breakpoint
CREATE INDEX `memberships_status_idx` ON `memberships` (`status`);--> statement-breakpoint
CREATE INDEX `officer_assignments_active_idx` ON `officerAssignments` (`status`,`startsOn`,`endsOn`);--> statement-breakpoint
CREATE INDEX `officer_assignments_user_idx` ON `officerAssignments` (`userId`,`departmentId`);--> statement-breakpoint
CREATE INDEX `project_assignments_user_idx` ON `projectAssignments` (`userId`,`status`);--> statement-breakpoint
CREATE INDEX `projects_department_status_idx` ON `projects` (`departmentId`,`status`);--> statement-breakpoint
CREATE INDEX `recruitment_cycles_status_idx` ON `recruitmentCycles` (`status`,`audienceType`);--> statement-breakpoint
CREATE INDEX `resources_visibility_idx` ON `resources` (`visibility`,`projectId`);--> statement-breakpoint
CREATE INDEX `users_account_status_idx` ON `users` (`accountStatus`);--> statement-breakpoint
CREATE INDEX `verification_codes_user_purpose_idx` ON `verificationCodes` (`userId`,`purpose`,`expiresAt`);