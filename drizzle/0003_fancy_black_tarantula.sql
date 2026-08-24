CREATE TABLE `lucy_conversation_events` (
	`id` varchar(36) NOT NULL,
	`chat_id` varchar(191) NOT NULL,
	`message_id` varchar(191),
	`role` enum('user','assistant','system') NOT NULL,
	`text` text NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `lucy_conversation_events_id` PRIMARY KEY(`id`)
);
