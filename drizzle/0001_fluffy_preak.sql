CREATE TABLE `lucy_twilio_credentials` (
	`id` int AUTO_INCREMENT NOT NULL,
	`owner_user_id` int NOT NULL,
	`account_sid` varchar(64) NOT NULL,
	`auth_token_encrypted` text NOT NULL,
	`phone_number` varchar(32) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `lucy_twilio_credentials_id` PRIMARY KEY(`id`),
	CONSTRAINT `lucy_twilio_credentials_owner_user_id_unique` UNIQUE(`owner_user_id`)
);
