DROP TABLE `permissions`;--> statement-breakpoint
DROP TABLE `roles`;--> statement-breakpoint
DROP TABLE `user_roles`;--> statement-breakpoint
ALTER TABLE `audit_logs` ADD `tenant_id` text REFERENCES workspaces(id);--> statement-breakpoint
CREATE INDEX `audit_logs_tenant_idx` ON `audit_logs` (`tenant_id`);