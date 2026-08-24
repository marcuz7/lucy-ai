CREATE TABLE `lucy_telnyx_credentials` (
	`id` int AUTO_INCREMENT NOT NULL,
	`owner_user_id` int NOT NULL,
	`api_key_encrypted` text NOT NULL,
	`public_key` text NOT NULL,
	`phone_number` varchar(32) NOT NULL,
	`allowed_senders` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `lucy_telnyx_credentials_id` PRIMARY KEY(`id`),
	CONSTRAINT `lucy_telnyx_credentials_owner_user_id_unique` UNIQUE(`owner_user_id`)
);
