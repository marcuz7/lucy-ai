CREATE TABLE `lucy_android_gateway_credentials` (
	`id` int AUTO_INCREMENT NOT NULL,
	`owner_user_id` int NOT NULL,
	`api_url` varchar(1024) NOT NULL,
	`username_encrypted` text NOT NULL,
	`password_encrypted` text NOT NULL,
	`webhook_token_encrypted` text NOT NULL,
	`phone_number` varchar(32) NOT NULL,
	`allowed_senders` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `lucy_android_gateway_credentials_id` PRIMARY KEY(`id`),
	CONSTRAINT `lucy_android_gateway_credentials_owner_user_id_unique` UNIQUE(`owner_user_id`)
);
