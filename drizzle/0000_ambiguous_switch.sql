CREATE TABLE `lucy_jobs` (
	`id` varchar(36) NOT NULL,
	`message_id` varchar(191) NOT NULL,
	`chat_id` varchar(191) NOT NULL,
	`payload` json NOT NULL,
	`status` enum('pending','processing','completed','dead_letter') NOT NULL DEFAULT 'pending',
	`attempts` int NOT NULL DEFAULT 0,
	`available_at` timestamp NOT NULL DEFAULT (now()),
	`started_at` timestamp,
	`completed_at` timestamp,
	`last_error` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `lucy_jobs_id` PRIMARY KEY(`id`),
	CONSTRAINT `lucy_jobs_message_id_unique` UNIQUE(`message_id`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` int AUTO_INCREMENT NOT NULL,
	`openId` varchar(64) NOT NULL,
	`name` text,
	`email` varchar(320),
	`loginMethod` varchar(64),
	`role` enum('user','admin') NOT NULL DEFAULT 'user',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`lastSignedIn` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_openId_unique` UNIQUE(`openId`)
);
--> statement-breakpoint
CREATE INDEX `idx_lucy_jobs_status_available` ON `lucy_jobs` (`status`,`available_at`);--> statement-breakpoint
CREATE INDEX `idx_lucy_jobs_chat_created` ON `lucy_jobs` (`chat_id`,`created_at`);