ALTER TABLE `lucy_agent_runs` ADD `tool_calls_used` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `lucy_agent_runs` ADD `max_tool_calls` int DEFAULT 8 NOT NULL;--> statement-breakpoint
ALTER TABLE `lucy_agent_runs` ADD `cost_units_used` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `lucy_agent_runs` ADD `max_cost_units` int DEFAULT 20 NOT NULL;--> statement-breakpoint
ALTER TABLE `lucy_agent_runs` ADD `cancel_requested_at` timestamp;