CREATE TABLE `scheduledJobs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`jobKey` varchar(80) NOT NULL,
	`scheduleCronTaskUid` varchar(65),
	`isEnabled` boolean NOT NULL DEFAULT true,
	`lastRanAt` timestamp,
	`lastRunSummary` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `scheduledJobs_id` PRIMARY KEY(`id`),
	CONSTRAINT `scheduledJobs_jobKey_unique` UNIQUE(`jobKey`)
);
--> statement-breakpoint
CREATE INDEX `scheduled_jobs_task_uid_idx` ON `scheduledJobs` (`scheduleCronTaskUid`);