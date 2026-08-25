CREATE TABLE `lucy_redis_credentials` (
	`id` int AUTO_INCREMENT NOT NULL,
	`owner_user_id` int NOT NULL,
	`redis_url_encrypted` text NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `lucy_redis_credentials_id` PRIMARY KEY(`id`),
	CONSTRAINT `lucy_redis_credentials_owner_user_id_unique` UNIQUE(`owner_user_id`)
);
