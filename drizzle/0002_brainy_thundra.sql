CREATE TABLE `lucy_messages` (
	`id` varchar(191) NOT NULL,
	`channel` varchar(32) NOT NULL,
	`sender_id` varchar(191) NOT NULL,
	`chat_id` varchar(191) NOT NULL,
	`text` text NOT NULL,
	`media_count` int NOT NULL DEFAULT 0,
	`received_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `lucy_messages_id` PRIMARY KEY(`id`)
);
