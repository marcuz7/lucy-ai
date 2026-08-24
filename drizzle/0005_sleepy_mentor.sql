CREATE TABLE `lucy_agent_approvals` (
	`id` varchar(36) NOT NULL,
	`run_id` varchar(36) NOT NULL,
	`tool_call_id` varchar(36) NOT NULL,
	`action` varchar(255) NOT NULL,
	`token` varchar(64) NOT NULL,
	`status` enum('pending','approved','denied','expired') NOT NULL DEFAULT 'pending',
	`requested_at` timestamp NOT NULL DEFAULT (now()),
	`responded_at` timestamp,
	`expires_at` timestamp,
	CONSTRAINT `lucy_agent_approvals_id` PRIMARY KEY(`id`),
	CONSTRAINT `lucy_agent_approvals_token_unique` UNIQUE(`token`)
);
--> statement-breakpoint
CREATE TABLE `lucy_agent_runs` (
	`id` varchar(36) NOT NULL,
	`message_id` varchar(191) NOT NULL,
	`chat_id` varchar(191) NOT NULL,
	`sender_id` varchar(191) NOT NULL,
	`provider` varchar(32) NOT NULL DEFAULT 'managed',
	`status` enum('queued','planning','running','awaiting_approval','completed','failed','cancelled') NOT NULL DEFAULT 'queued',
	`request_text` text NOT NULL,
	`result_text` text,
	`current_step` int NOT NULL DEFAULT 0,
	`max_steps` int NOT NULL DEFAULT 6,
	`progress_sent_at` timestamp,
	`deadline_at` timestamp,
	`started_at` timestamp,
	`completed_at` timestamp,
	`last_error` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `lucy_agent_runs_id` PRIMARY KEY(`id`),
	CONSTRAINT `lucy_agent_runs_message_id_unique` UNIQUE(`message_id`)
);
--> statement-breakpoint
CREATE TABLE `lucy_agent_tool_calls` (
	`id` varchar(36) NOT NULL,
	`run_id` varchar(36) NOT NULL,
	`sequence` int NOT NULL,
	`tool_name` varchar(64) NOT NULL,
	`arguments` json NOT NULL,
	`status` enum('requested','running','succeeded','failed','denied') NOT NULL DEFAULT 'requested',
	`output` text,
	`error` text,
	`started_at` timestamp,
	`completed_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `lucy_agent_tool_calls_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `idx_lucy_agent_approvals_run_status` ON `lucy_agent_approvals` (`run_id`,`status`);--> statement-breakpoint
CREATE INDEX `idx_lucy_agent_runs_status_created` ON `lucy_agent_runs` (`status`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_lucy_agent_runs_chat_created` ON `lucy_agent_runs` (`chat_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_lucy_agent_tool_calls_run_sequence` ON `lucy_agent_tool_calls` (`run_id`,`sequence`);