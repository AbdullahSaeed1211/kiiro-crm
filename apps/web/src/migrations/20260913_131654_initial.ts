import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-d1-sqlite'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.run(sql`CREATE TABLE \`users_sessions\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` text(36) NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`created_at\` text,
  	\`expires_at\` text NOT NULL,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`users_sessions_order_idx\` ON \`users_sessions\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`users_sessions_parent_id_idx\` ON \`users_sessions\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`users\` (
  	\`id\` text(36) PRIMARY KEY NOT NULL,
  	\`name\` text NOT NULL,
  	\`role\` text DEFAULT 'staff' NOT NULL,
  	\`active\` integer DEFAULT true,
  	\`reports_to_id\` text(36),
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`email\` text NOT NULL,
  	\`reset_password_token\` text,
  	\`reset_password_expiration\` text,
  	\`salt\` text,
  	\`hash\` text,
  	\`login_attempts\` numeric DEFAULT 0,
  	\`lock_until\` text,
  	FOREIGN KEY (\`reports_to_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `)
  await db.run(sql`CREATE INDEX \`users_role_idx\` ON \`users\` (\`role\`);`)
  await db.run(sql`CREATE INDEX \`users_active_idx\` ON \`users\` (\`active\`);`)
  await db.run(sql`CREATE INDEX \`users_reports_to_idx\` ON \`users\` (\`reports_to_id\`);`)
  await db.run(sql`CREATE INDEX \`users_updated_at_idx\` ON \`users\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`users_created_at_idx\` ON \`users\` (\`created_at\`);`)
  await db.run(sql`CREATE UNIQUE INDEX \`users_email_idx\` ON \`users\` (\`email\`);`)
  await db.run(sql`CREATE TABLE \`users_rels\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`order\` integer,
  	\`parent_id\` text(36) NOT NULL,
  	\`path\` text NOT NULL,
  	\`groups_id\` text(36),
  	FOREIGN KEY (\`parent_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`groups_id\`) REFERENCES \`groups\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`users_rels_order_idx\` ON \`users_rels\` (\`order\`);`)
  await db.run(sql`CREATE INDEX \`users_rels_parent_idx\` ON \`users_rels\` (\`parent_id\`);`)
  await db.run(sql`CREATE INDEX \`users_rels_path_idx\` ON \`users_rels\` (\`path\`);`)
  await db.run(sql`CREATE INDEX \`users_rels_groups_id_idx\` ON \`users_rels\` (\`groups_id\`);`)
  await db.run(sql`CREATE TABLE \`groups\` (
  	\`id\` text(36) PRIMARY KEY NOT NULL,
  	\`name\` text NOT NULL,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
  );
  `)
  await db.run(sql`CREATE UNIQUE INDEX \`groups_name_idx\` ON \`groups\` (\`name\`);`)
  await db.run(sql`CREATE INDEX \`groups_updated_at_idx\` ON \`groups\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`groups_created_at_idx\` ON \`groups\` (\`created_at\`);`)
  await db.run(sql`CREATE TABLE \`organizations\` (
  	\`id\` text(36) PRIMARY KEY NOT NULL,
  	\`name\` text NOT NULL,
  	\`website\` text,
  	\`phone\` text,
  	\`email\` text,
  	\`owner_id\` text(36),
  	\`custom_data\` text,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	FOREIGN KEY (\`owner_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `)
  await db.run(sql`CREATE INDEX \`organizations_name_idx\` ON \`organizations\` (\`name\`);`)
  await db.run(sql`CREATE INDEX \`organizations_owner_idx\` ON \`organizations\` (\`owner_id\`);`)
  await db.run(sql`CREATE INDEX \`organizations_updated_at_idx\` ON \`organizations\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`organizations_created_at_idx\` ON \`organizations\` (\`created_at\`);`)
  await db.run(sql`CREATE TABLE \`projects\` (
  	\`id\` text(36) PRIMARY KEY NOT NULL,
  	\`name\` text NOT NULL,
  	\`organization_id\` text(36),
  	\`owner_id\` text(36),
  	\`workflow_id\` text(36),
  	\`stage_id\` text,
  	\`stage_entered_at\` numeric,
  	\`start_at\` numeric,
  	\`target_end_at\` numeric,
  	\`description\` text,
  	\`custom_data\` text,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	FOREIGN KEY (\`organization_id\`) REFERENCES \`organizations\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`owner_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`workflow_id\`) REFERENCES \`workflows\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `)
  await db.run(sql`CREATE INDEX \`projects_organization_idx\` ON \`projects\` (\`organization_id\`);`)
  await db.run(sql`CREATE INDEX \`projects_owner_idx\` ON \`projects\` (\`owner_id\`);`)
  await db.run(sql`CREATE INDEX \`projects_workflow_idx\` ON \`projects\` (\`workflow_id\`);`)
  await db.run(sql`CREATE INDEX \`projects_stage_id_idx\` ON \`projects\` (\`stage_id\`);`)
  await db.run(sql`CREATE INDEX \`projects_updated_at_idx\` ON \`projects\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`projects_created_at_idx\` ON \`projects\` (\`created_at\`);`)
  await db.run(sql`CREATE TABLE \`projects_rels\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`order\` integer,
  	\`parent_id\` text(36) NOT NULL,
  	\`path\` text NOT NULL,
  	\`users_id\` text(36),
  	FOREIGN KEY (\`parent_id\`) REFERENCES \`projects\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`users_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`projects_rels_order_idx\` ON \`projects_rels\` (\`order\`);`)
  await db.run(sql`CREATE INDEX \`projects_rels_parent_idx\` ON \`projects_rels\` (\`parent_id\`);`)
  await db.run(sql`CREATE INDEX \`projects_rels_path_idx\` ON \`projects_rels\` (\`path\`);`)
  await db.run(sql`CREATE INDEX \`projects_rels_users_id_idx\` ON \`projects_rels\` (\`users_id\`);`)
  await db.run(sql`CREATE TABLE \`tasks\` (
  	\`id\` text(36) PRIMARY KEY NOT NULL,
  	\`title\` text NOT NULL,
  	\`description\` text,
  	\`project_id\` text(36),
  	\`related_type\` text,
  	\`related_id\` text,
  	\`parent_task_id\` text(36),
  	\`workflow_id\` text(36),
  	\`stage_id\` text,
  	\`stage_entered_at\` numeric,
  	\`rank\` text,
  	\`priority\` text DEFAULT 'none' NOT NULL,
  	\`group_id\` text(36),
  	\`start_at\` numeric,
  	\`due_at\` numeric,
  	\`completed_at\` numeric,
  	\`custom_data\` text,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	FOREIGN KEY (\`project_id\`) REFERENCES \`projects\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`parent_task_id\`) REFERENCES \`tasks\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`workflow_id\`) REFERENCES \`workflows\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`group_id\`) REFERENCES \`groups\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `)
  await db.run(sql`CREATE INDEX \`tasks_project_idx\` ON \`tasks\` (\`project_id\`);`)
  await db.run(sql`CREATE INDEX \`tasks_parent_task_idx\` ON \`tasks\` (\`parent_task_id\`);`)
  await db.run(sql`CREATE INDEX \`tasks_workflow_idx\` ON \`tasks\` (\`workflow_id\`);`)
  await db.run(sql`CREATE INDEX \`tasks_stage_id_idx\` ON \`tasks\` (\`stage_id\`);`)
  await db.run(sql`CREATE INDEX \`tasks_group_idx\` ON \`tasks\` (\`group_id\`);`)
  await db.run(sql`CREATE INDEX \`tasks_due_at_idx\` ON \`tasks\` (\`due_at\`);`)
  await db.run(sql`CREATE INDEX \`tasks_updated_at_idx\` ON \`tasks\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`tasks_created_at_idx\` ON \`tasks\` (\`created_at\`);`)
  await db.run(sql`CREATE INDEX \`project_stageId_rank_idx\` ON \`tasks\` (\`project_id\`,\`stage_id\`,\`rank\`);`)
  await db.run(sql`CREATE INDEX \`relatedType_relatedId_idx\` ON \`tasks\` (\`related_type\`,\`related_id\`);`)
  await db.run(sql`CREATE TABLE \`tasks_rels\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`order\` integer,
  	\`parent_id\` text(36) NOT NULL,
  	\`path\` text NOT NULL,
  	\`users_id\` text(36),
  	FOREIGN KEY (\`parent_id\`) REFERENCES \`tasks\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`users_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`tasks_rels_order_idx\` ON \`tasks_rels\` (\`order\`);`)
  await db.run(sql`CREATE INDEX \`tasks_rels_parent_idx\` ON \`tasks_rels\` (\`parent_id\`);`)
  await db.run(sql`CREATE INDEX \`tasks_rels_path_idx\` ON \`tasks_rels\` (\`path\`);`)
  await db.run(sql`CREATE INDEX \`tasks_rels_users_id_idx\` ON \`tasks_rels\` (\`users_id\`);`)
  await db.run(sql`CREATE TABLE \`workflows_stages\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` text(36) NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`name\` text NOT NULL,
  	\`category\` text NOT NULL,
  	\`color\` text DEFAULT 'gray' NOT NULL,
  	\`position\` numeric NOT NULL,
  	\`probability\` numeric,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`workflows\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`workflows_stages_order_idx\` ON \`workflows_stages\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`workflows_stages_parent_id_idx\` ON \`workflows_stages\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`workflows\` (
  	\`id\` text(36) PRIMARY KEY NOT NULL,
  	\`record_type\` text NOT NULL,
  	\`name\` text NOT NULL,
  	\`default_stage_id\` text,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
  );
  `)
  await db.run(sql`CREATE INDEX \`workflows_record_type_idx\` ON \`workflows\` (\`record_type\`);`)
  await db.run(sql`CREATE INDEX \`workflows_updated_at_idx\` ON \`workflows\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`workflows_created_at_idx\` ON \`workflows\` (\`created_at\`);`)
  await db.run(sql`CREATE TABLE \`activity\` (
  	\`id\` text(36) PRIMARY KEY NOT NULL,
  	\`record_type\` text NOT NULL,
  	\`record_id\` text NOT NULL,
  	\`verb\` text NOT NULL,
  	\`actor_id\` text(36),
  	\`data\` text,
  	\`occurred_at\` numeric NOT NULL,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	FOREIGN KEY (\`actor_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `)
  await db.run(sql`CREATE INDEX \`activity_actor_idx\` ON \`activity\` (\`actor_id\`);`)
  await db.run(sql`CREATE INDEX \`activity_updated_at_idx\` ON \`activity\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`activity_created_at_idx\` ON \`activity\` (\`created_at\`);`)
  await db.run(sql`CREATE INDEX \`recordType_recordId_occurredAt_idx\` ON \`activity\` (\`record_type\`,\`record_id\`,\`occurred_at\`);`)
  await db.run(sql`CREATE TABLE \`attachments\` (
  	\`id\` text(36) PRIMARY KEY NOT NULL,
  	\`record_type\` text NOT NULL,
  	\`record_id\` text NOT NULL,
  	\`file_name\` text NOT NULL,
  	\`size_bytes\` numeric NOT NULL,
  	\`uploaded_by_id\` text(36),
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`url\` text,
  	\`thumbnail_u_r_l\` text,
  	\`filename\` text,
  	\`mime_type\` text,
  	\`filesize\` numeric,
  	\`width\` numeric,
  	\`height\` numeric,
  	FOREIGN KEY (\`uploaded_by_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `)
  await db.run(sql`CREATE INDEX \`attachments_uploaded_by_idx\` ON \`attachments\` (\`uploaded_by_id\`);`)
  await db.run(sql`CREATE INDEX \`attachments_updated_at_idx\` ON \`attachments\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`attachments_created_at_idx\` ON \`attachments\` (\`created_at\`);`)
  await db.run(sql`CREATE UNIQUE INDEX \`attachments_filename_idx\` ON \`attachments\` (\`filename\`);`)
  await db.run(sql`CREATE INDEX \`recordType_recordId_idx\` ON \`attachments\` (\`record_type\`,\`record_id\`);`)
  await db.run(sql`CREATE TABLE \`notifications\` (
  	\`id\` text(36) PRIMARY KEY NOT NULL,
  	\`user_id\` text(36) NOT NULL,
  	\`type\` text NOT NULL,
  	\`record_type\` text,
  	\`record_id\` text,
  	\`actor_id\` text(36),
  	\`data\` text,
  	\`dedupe_key\` text NOT NULL,
  	\`read_at\` numeric,
  	\`emailed_at\` numeric,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`actor_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `)
  await db.run(sql`CREATE INDEX \`notifications_user_idx\` ON \`notifications\` (\`user_id\`);`)
  await db.run(sql`CREATE INDEX \`notifications_actor_idx\` ON \`notifications\` (\`actor_id\`);`)
  await db.run(sql`CREATE UNIQUE INDEX \`notifications_dedupe_key_idx\` ON \`notifications\` (\`dedupe_key\`);`)
  await db.run(sql`CREATE INDEX \`notifications_updated_at_idx\` ON \`notifications\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`notifications_created_at_idx\` ON \`notifications\` (\`created_at\`);`)
  await db.run(sql`CREATE INDEX \`user_readAt_createdAt_idx\` ON \`notifications\` (\`user_id\`,\`read_at\`,\`created_at\`);`)
  await db.run(sql`CREATE TABLE \`email_messages\` (
  	\`id\` text(36) PRIMARY KEY NOT NULL,
  	\`direction\` text NOT NULL,
  	\`record_type\` text,
  	\`record_id\` text,
  	\`message_id\` text NOT NULL,
  	\`in_reply_to\` text,
  	\`from\` text NOT NULL,
  	\`to\` text DEFAULT '[]',
  	\`cc\` text DEFAULT '[]',
  	\`subject\` text,
  	\`text_body\` text,
  	\`html_file_key\` text,
  	\`status\` text NOT NULL,
  	\`error\` text,
  	\`occurred_at\` numeric NOT NULL,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
  );
  `)
  await db.run(sql`CREATE UNIQUE INDEX \`email_messages_message_id_idx\` ON \`email_messages\` (\`message_id\`);`)
  await db.run(sql`CREATE INDEX \`email_messages_updated_at_idx\` ON \`email_messages\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`email_messages_created_at_idx\` ON \`email_messages\` (\`created_at\`);`)
  await db.run(sql`CREATE INDEX \`recordType_recordId_occurredAt_1_idx\` ON \`email_messages\` (\`record_type\`,\`record_id\`,\`occurred_at\`);`)
  await db.run(sql`CREATE TABLE \`email_messages_rels\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`order\` integer,
  	\`parent_id\` text(36) NOT NULL,
  	\`path\` text NOT NULL,
  	\`attachments_id\` text(36),
  	FOREIGN KEY (\`parent_id\`) REFERENCES \`email_messages\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`attachments_id\`) REFERENCES \`attachments\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`email_messages_rels_order_idx\` ON \`email_messages_rels\` (\`order\`);`)
  await db.run(sql`CREATE INDEX \`email_messages_rels_parent_idx\` ON \`email_messages_rels\` (\`parent_id\`);`)
  await db.run(sql`CREATE INDEX \`email_messages_rels_path_idx\` ON \`email_messages_rels\` (\`path\`);`)
  await db.run(sql`CREATE INDEX \`email_messages_rels_attachments_id_idx\` ON \`email_messages_rels\` (\`attachments_id\`);`)
  await db.run(sql`CREATE TABLE \`job_runs\` (
  	\`id\` text(36) PRIMARY KEY NOT NULL,
  	\`job\` text NOT NULL,
  	\`window_start\` numeric NOT NULL,
  	\`status\` text DEFAULT 'running' NOT NULL,
  	\`processed\` numeric,
  	\`created\` numeric,
  	\`skipped\` numeric,
  	\`duration_ms\` numeric,
  	\`cursor\` text,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
  );
  `)
  await db.run(sql`CREATE INDEX \`job_runs_updated_at_idx\` ON \`job_runs\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`job_runs_created_at_idx\` ON \`job_runs\` (\`created_at\`);`)
  await db.run(sql`CREATE UNIQUE INDEX \`job_windowStart_idx\` ON \`job_runs\` (\`job\`,\`window_start\`);`)
  await db.run(sql`CREATE TABLE \`payload_kv\` (
  	\`id\` text(36) PRIMARY KEY NOT NULL,
  	\`key\` text NOT NULL,
  	\`data\` text NOT NULL
  );
  `)
  await db.run(sql`CREATE UNIQUE INDEX \`payload_kv_key_idx\` ON \`payload_kv\` (\`key\`);`)
  await db.run(sql`CREATE TABLE \`payload_locked_documents\` (
  	\`id\` text(36) PRIMARY KEY NOT NULL,
  	\`global_slug\` text,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
  );
  `)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_global_slug_idx\` ON \`payload_locked_documents\` (\`global_slug\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_updated_at_idx\` ON \`payload_locked_documents\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_created_at_idx\` ON \`payload_locked_documents\` (\`created_at\`);`)
  await db.run(sql`CREATE TABLE \`payload_locked_documents_rels\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`order\` integer,
  	\`parent_id\` text(36) NOT NULL,
  	\`path\` text NOT NULL,
  	\`users_id\` text(36),
  	\`groups_id\` text(36),
  	\`organizations_id\` text(36),
  	\`projects_id\` text(36),
  	\`tasks_id\` text(36),
  	\`workflows_id\` text(36),
  	\`activity_id\` text(36),
  	\`attachments_id\` text(36),
  	\`notifications_id\` text(36),
  	\`email_messages_id\` text(36),
  	\`job_runs_id\` text(36),
  	FOREIGN KEY (\`parent_id\`) REFERENCES \`payload_locked_documents\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`users_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`groups_id\`) REFERENCES \`groups\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`organizations_id\`) REFERENCES \`organizations\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`projects_id\`) REFERENCES \`projects\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`tasks_id\`) REFERENCES \`tasks\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`workflows_id\`) REFERENCES \`workflows\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`activity_id\`) REFERENCES \`activity\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`attachments_id\`) REFERENCES \`attachments\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`notifications_id\`) REFERENCES \`notifications\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`email_messages_id\`) REFERENCES \`email_messages\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`job_runs_id\`) REFERENCES \`job_runs\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_order_idx\` ON \`payload_locked_documents_rels\` (\`order\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_parent_idx\` ON \`payload_locked_documents_rels\` (\`parent_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_path_idx\` ON \`payload_locked_documents_rels\` (\`path\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_users_id_idx\` ON \`payload_locked_documents_rels\` (\`users_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_groups_id_idx\` ON \`payload_locked_documents_rels\` (\`groups_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_organizations_id_idx\` ON \`payload_locked_documents_rels\` (\`organizations_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_projects_id_idx\` ON \`payload_locked_documents_rels\` (\`projects_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_tasks_id_idx\` ON \`payload_locked_documents_rels\` (\`tasks_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_workflows_id_idx\` ON \`payload_locked_documents_rels\` (\`workflows_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_activity_id_idx\` ON \`payload_locked_documents_rels\` (\`activity_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_attachments_id_idx\` ON \`payload_locked_documents_rels\` (\`attachments_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_notifications_id_idx\` ON \`payload_locked_documents_rels\` (\`notifications_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_email_messages_id_idx\` ON \`payload_locked_documents_rels\` (\`email_messages_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_job_runs_id_idx\` ON \`payload_locked_documents_rels\` (\`job_runs_id\`);`)
  await db.run(sql`CREATE TABLE \`payload_preferences\` (
  	\`id\` text(36) PRIMARY KEY NOT NULL,
  	\`key\` text,
  	\`value\` text,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
  );
  `)
  await db.run(sql`CREATE INDEX \`payload_preferences_key_idx\` ON \`payload_preferences\` (\`key\`);`)
  await db.run(sql`CREATE INDEX \`payload_preferences_updated_at_idx\` ON \`payload_preferences\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`payload_preferences_created_at_idx\` ON \`payload_preferences\` (\`created_at\`);`)
  await db.run(sql`CREATE TABLE \`payload_preferences_rels\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`order\` integer,
  	\`parent_id\` text(36) NOT NULL,
  	\`path\` text NOT NULL,
  	\`users_id\` text(36),
  	FOREIGN KEY (\`parent_id\`) REFERENCES \`payload_preferences\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`users_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`payload_preferences_rels_order_idx\` ON \`payload_preferences_rels\` (\`order\`);`)
  await db.run(sql`CREATE INDEX \`payload_preferences_rels_parent_idx\` ON \`payload_preferences_rels\` (\`parent_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_preferences_rels_path_idx\` ON \`payload_preferences_rels\` (\`path\`);`)
  await db.run(sql`CREATE INDEX \`payload_preferences_rels_users_id_idx\` ON \`payload_preferences_rels\` (\`users_id\`);`)
  await db.run(sql`CREATE TABLE \`payload_migrations\` (
  	\`id\` text(36) PRIMARY KEY NOT NULL,
  	\`name\` text,
  	\`batch\` numeric,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
  );
  `)
  await db.run(sql`CREATE INDEX \`payload_migrations_updated_at_idx\` ON \`payload_migrations\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`payload_migrations_created_at_idx\` ON \`payload_migrations\` (\`created_at\`);`)
  await db.run(sql`CREATE TABLE \`settings_applied_templates\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` text(36) NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`key\` text NOT NULL,
  	\`version\` numeric NOT NULL,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`settings\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`settings_applied_templates_order_idx\` ON \`settings_applied_templates\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`settings_applied_templates_parent_id_idx\` ON \`settings_applied_templates\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`settings\` (
  	\`id\` text(36) PRIMARY KEY NOT NULL,
  	\`app_name\` text,
  	\`timezone\` text DEFAULT 'UTC' NOT NULL,
  	\`locale\` text DEFAULT 'en' NOT NULL,
  	\`currency\` text DEFAULT 'USD' NOT NULL,
  	\`week_starts_on\` numeric DEFAULT 0 NOT NULL,
  	\`brand_primary_hex\` text,
  	\`brand_radius\` text DEFAULT 'md' NOT NULL,
  	\`modules_crm\` integer DEFAULT true,
  	\`modules_work\` integer DEFAULT true,
  	\`modules_intake\` integer DEFAULT true,
  	\`modules_mail\` integer DEFAULT true,
  	\`stalled_days\` numeric DEFAULT 14 NOT NULL,
  	\`email_from_name\` text,
  	\`email_from_address\` text,
  	\`email_sender_status\` text DEFAULT 'unverified' NOT NULL,
  	\`email_inbound_domain\` text,
  	\`email_inbound_local_prefix\` text,
  	\`onboarded_at\` numeric,
  	\`updated_at\` text,
  	\`created_at\` text
  );
  `)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.run(sql`DROP TABLE \`users_sessions\`;`)
  await db.run(sql`DROP TABLE \`users\`;`)
  await db.run(sql`DROP TABLE \`users_rels\`;`)
  await db.run(sql`DROP TABLE \`groups\`;`)
  await db.run(sql`DROP TABLE \`organizations\`;`)
  await db.run(sql`DROP TABLE \`projects\`;`)
  await db.run(sql`DROP TABLE \`projects_rels\`;`)
  await db.run(sql`DROP TABLE \`tasks\`;`)
  await db.run(sql`DROP TABLE \`tasks_rels\`;`)
  await db.run(sql`DROP TABLE \`workflows_stages\`;`)
  await db.run(sql`DROP TABLE \`workflows\`;`)
  await db.run(sql`DROP TABLE \`activity\`;`)
  await db.run(sql`DROP TABLE \`attachments\`;`)
  await db.run(sql`DROP TABLE \`notifications\`;`)
  await db.run(sql`DROP TABLE \`email_messages\`;`)
  await db.run(sql`DROP TABLE \`email_messages_rels\`;`)
  await db.run(sql`DROP TABLE \`job_runs\`;`)
  await db.run(sql`DROP TABLE \`payload_kv\`;`)
  await db.run(sql`DROP TABLE \`payload_locked_documents\`;`)
  await db.run(sql`DROP TABLE \`payload_locked_documents_rels\`;`)
  await db.run(sql`DROP TABLE \`payload_preferences\`;`)
  await db.run(sql`DROP TABLE \`payload_preferences_rels\`;`)
  await db.run(sql`DROP TABLE \`payload_migrations\`;`)
  await db.run(sql`DROP TABLE \`settings_applied_templates\`;`)
  await db.run(sql`DROP TABLE \`settings\`;`)
}
