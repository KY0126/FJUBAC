CREATE TABLE `eventCheckInSessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`eventId` int NOT NULL,
	`label` varchar(100) NOT NULL,
	`status` enum('active','paused','closed') NOT NULL DEFAULT 'active',
	`tokenHash` varchar(128) NOT NULL,
	`startsAt` timestamp NOT NULL,
	`endsAt` timestamp NOT NULL,
	`createdByUserId` int,
	`rotatedAt` timestamp,
	`closedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `eventCheckInSessions_id` PRIMARY KEY(`id`),
	CONSTRAINT `event_checkin_sessions_token_hash_unique` UNIQUE(`tokenHash`)
);
--> statement-breakpoint
CREATE TABLE `eventCheckIns` (
	`id` int AUTO_INCREMENT NOT NULL,
	`eventId` int NOT NULL,
	`sessionId` int NOT NULL,
	`registrationId` int NOT NULL,
	`userId` int NOT NULL,
	`method` enum('qr','manual') NOT NULL,
	`attendanceStatus` enum('attended','absent') NOT NULL DEFAULT 'attended',
	`recordedByUserId` int,
	`correctionReason` varchar(300),
	`checkedInAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `eventCheckIns_id` PRIMARY KEY(`id`),
	CONSTRAINT `event_checkins_event_user_unique` UNIQUE(`eventId`,`userId`),
	CONSTRAINT `event_checkins_registration_unique` UNIQUE(`registrationId`)
);
--> statement-breakpoint
ALTER TABLE `eventCheckInSessions` ADD CONSTRAINT `eventCheckInSessions_eventId_events_id_fk` FOREIGN KEY (`eventId`) REFERENCES `events`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `eventCheckInSessions` ADD CONSTRAINT `eventCheckInSessions_createdByUserId_users_id_fk` FOREIGN KEY (`createdByUserId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `eventCheckIns` ADD CONSTRAINT `eventCheckIns_eventId_events_id_fk` FOREIGN KEY (`eventId`) REFERENCES `events`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `eventCheckIns` ADD CONSTRAINT `eventCheckIns_sessionId_eventCheckInSessions_id_fk` FOREIGN KEY (`sessionId`) REFERENCES `eventCheckInSessions`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `eventCheckIns` ADD CONSTRAINT `eventCheckIns_registrationId_eventRegistrations_id_fk` FOREIGN KEY (`registrationId`) REFERENCES `eventRegistrations`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `eventCheckIns` ADD CONSTRAINT `eventCheckIns_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `eventCheckIns` ADD CONSTRAINT `eventCheckIns_recordedByUserId_users_id_fk` FOREIGN KEY (`recordedByUserId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `event_checkin_sessions_event_status_idx` ON `eventCheckInSessions` (`eventId`,`status`);--> statement-breakpoint
CREATE INDEX `event_checkins_session_created_idx` ON `eventCheckIns` (`sessionId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `event_checkins_user_created_idx` ON `eventCheckIns` (`userId`,`createdAt`);