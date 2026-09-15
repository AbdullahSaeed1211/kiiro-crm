import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-d1-sqlite'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.run(sql`CREATE TABLE \`invitations\` (
  	\`id\` text(36) PRIMARY KEY NOT NULL,
  	\`token_hash\` text NOT NULL,
  	\`email\` text NOT NULL,
  	\`role\` text NOT NULL,
  	\`status\` text DEFAULT 'pending' NOT NULL,
  	\`invited_by_id\` text(36),
  	\`reports_to_id\` text(36),
  	\`expires_at\` numeric NOT NULL,
  	\`accepted_at\` numeric,
  	\`claim_id\` text,
  	\`claimed_at\` numeric,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	FOREIGN KEY (\`invited_by_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`reports_to_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `)
  await db.run(sql`CREATE UNIQUE INDEX \`invitations_token_hash_idx\` ON \`invitations\` (\`token_hash\`);`)
  await db.run(sql`CREATE INDEX \`invitations_email_idx\` ON \`invitations\` (\`email\`);`)
  await db.run(sql`CREATE INDEX \`invitations_status_idx\` ON \`invitations\` (\`status\`);`)
  await db.run(sql`CREATE INDEX \`invitations_invited_by_idx\` ON \`invitations\` (\`invited_by_id\`);`)
  await db.run(sql`CREATE INDEX \`invitations_reports_to_idx\` ON \`invitations\` (\`reports_to_id\`);`)
  await db.run(sql`CREATE INDEX \`invitations_expires_at_idx\` ON \`invitations\` (\`expires_at\`);`)
  await db.run(sql`CREATE INDEX \`invitations_claim_id_idx\` ON \`invitations\` (\`claim_id\`);`)
  await db.run(sql`CREATE INDEX \`invitations_updated_at_idx\` ON \`invitations\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`invitations_created_at_idx\` ON \`invitations\` (\`created_at\`);`)
  await db.run(sql`CREATE TABLE \`invitations_rels\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`order\` integer,
  	\`parent_id\` text(36) NOT NULL,
  	\`path\` text NOT NULL,
  	\`groups_id\` text(36),
  	FOREIGN KEY (\`parent_id\`) REFERENCES \`invitations\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`groups_id\`) REFERENCES \`groups\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`invitations_rels_order_idx\` ON \`invitations_rels\` (\`order\`);`)
  await db.run(sql`CREATE INDEX \`invitations_rels_parent_idx\` ON \`invitations_rels\` (\`parent_id\`);`)
  await db.run(sql`CREATE INDEX \`invitations_rels_path_idx\` ON \`invitations_rels\` (\`path\`);`)
  await db.run(sql`CREATE INDEX \`invitations_rels_groups_id_idx\` ON \`invitations_rels\` (\`groups_id\`);`)
  await db.run(sql`CREATE TABLE \`field_definitions\` (
  	\`id\` text(36) PRIMARY KEY NOT NULL,
  	\`record_type\` text NOT NULL,
  	\`key\` text NOT NULL,
  	\`label\` text NOT NULL,
  	\`type\` text NOT NULL,
  	\`required\` integer DEFAULT false,
  	\`options\` text DEFAULT '[]',
  	\`visibility\` text DEFAULT 'all',
  	\`sensitive\` integer DEFAULT false,
  	\`hidden\` integer DEFAULT false,
  	\`position\` numeric DEFAULT 0,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
  );
  `)
  await db.run(sql`CREATE INDEX \`field_definitions_record_type_idx\` ON \`field_definitions\` (\`record_type\`);`)
  await db.run(sql`CREATE INDEX \`field_definitions_key_idx\` ON \`field_definitions\` (\`key\`);`)
  await db.run(sql`CREATE INDEX \`field_definitions_updated_at_idx\` ON \`field_definitions\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`field_definitions_created_at_idx\` ON \`field_definitions\` (\`created_at\`);`)
  await db.run(sql`CREATE UNIQUE INDEX \`recordType_key_idx\` ON \`field_definitions\` (\`record_type\`,\`key\`);`)
  await db.run(sql`CREATE TABLE \`saved_views\` (
  	\`id\` text(36) PRIMARY KEY NOT NULL,
  	\`record_type\` text NOT NULL,
  	\`owner_id\` text(36),
  	\`name\` text NOT NULL,
  	\`kind\` text NOT NULL,
  	\`filter\` text,
  	\`sort\` text NOT NULL,
  	\`columns\` text NOT NULL,
  	\`pinned\` integer DEFAULT false,
  	\`is_default\` integer DEFAULT false,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	FOREIGN KEY (\`owner_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `)
  await db.run(sql`CREATE INDEX \`saved_views_record_type_idx\` ON \`saved_views\` (\`record_type\`);`)
  await db.run(sql`CREATE INDEX \`saved_views_owner_idx\` ON \`saved_views\` (\`owner_id\`);`)
  await db.run(sql`CREATE INDEX \`saved_views_updated_at_idx\` ON \`saved_views\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`saved_views_created_at_idx\` ON \`saved_views\` (\`created_at\`);`)
  await db.run(sql`CREATE INDEX \`recordType_owner_idx\` ON \`saved_views\` (\`record_type\`,\`owner_id\`);`)
  await db.run(sql`CREATE TABLE \`layouts\` (
  	\`id\` text(36) PRIMARY KEY NOT NULL,
  	\`record_type\` text NOT NULL,
  	\`sidebar_fields\` text NOT NULL,
  	\`quick_create_fields\` text NOT NULL,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
  );
  `)
  await db.run(sql`CREATE UNIQUE INDEX \`layouts_record_type_idx\` ON \`layouts\` (\`record_type\`);`)
  await db.run(sql`CREATE INDEX \`layouts_updated_at_idx\` ON \`layouts\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`layouts_created_at_idx\` ON \`layouts\` (\`created_at\`);`)
  await db.run(sql`CREATE TABLE \`notification_prefs\` (
  	\`id\` text(36) PRIMARY KEY NOT NULL,
  	\`user_id\` text(36) NOT NULL,
  	\`channels\` text NOT NULL,
  	\`digest_local_time\` text,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `)
  await db.run(sql`CREATE UNIQUE INDEX \`notification_prefs_user_idx\` ON \`notification_prefs\` (\`user_id\`);`)
  await db.run(sql`CREATE INDEX \`notification_prefs_updated_at_idx\` ON \`notification_prefs\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`notification_prefs_created_at_idx\` ON \`notification_prefs\` (\`created_at\`);`)
  await db.run(sql`CREATE TABLE \`intake_forms\` (
  	\`id\` text(36) PRIMARY KEY NOT NULL,
  	\`key\` text NOT NULL,
  	\`name\` text NOT NULL,
  	\`active\` integer DEFAULT true NOT NULL,
  	\`target_record_type\` text DEFAULT 'lead' NOT NULL,
  	\`field_map\` text NOT NULL,
  	\`allowed_origins\` text DEFAULT '[]',
  	\`require_turnstile\` integer DEFAULT true NOT NULL,
  	\`server_key_hashes\` text DEFAULT '[]',
  	\`default_owner_id\` text(36),
  	\`default_source_id\` text(36),
  	\`success_message\` text NOT NULL,
  	\`redirect_url\` text,
  	\`email_alias\` text,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	FOREIGN KEY (\`default_owner_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`default_source_id\`) REFERENCES \`sources\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `)
  await db.run(sql`CREATE UNIQUE INDEX \`intake_forms_key_idx\` ON \`intake_forms\` (\`key\`);`)
  await db.run(sql`CREATE INDEX \`intake_forms_default_owner_idx\` ON \`intake_forms\` (\`default_owner_id\`);`)
  await db.run(sql`CREATE INDEX \`intake_forms_default_source_idx\` ON \`intake_forms\` (\`default_source_id\`);`)
  await db.run(sql`CREATE UNIQUE INDEX \`intake_forms_email_alias_idx\` ON \`intake_forms\` (\`email_alias\`);`)
  await db.run(sql`CREATE INDEX \`intake_forms_updated_at_idx\` ON \`intake_forms\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`intake_forms_created_at_idx\` ON \`intake_forms\` (\`created_at\`);`)
  await db.run(sql`CREATE TABLE \`intake_forms_rels\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`order\` integer,
  	\`parent_id\` text(36) NOT NULL,
  	\`path\` text NOT NULL,
  	\`users_id\` text(36),
  	\`groups_id\` text(36),
  	FOREIGN KEY (\`parent_id\`) REFERENCES \`intake_forms\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`users_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`groups_id\`) REFERENCES \`groups\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`intake_forms_rels_order_idx\` ON \`intake_forms_rels\` (\`order\`);`)
  await db.run(sql`CREATE INDEX \`intake_forms_rels_parent_idx\` ON \`intake_forms_rels\` (\`parent_id\`);`)
  await db.run(sql`CREATE INDEX \`intake_forms_rels_path_idx\` ON \`intake_forms_rels\` (\`path\`);`)
  await db.run(sql`CREATE INDEX \`intake_forms_rels_users_id_idx\` ON \`intake_forms_rels\` (\`users_id\`);`)
  await db.run(sql`CREATE INDEX \`intake_forms_rels_groups_id_idx\` ON \`intake_forms_rels\` (\`groups_id\`);`)
  await db.run(sql`CREATE TABLE \`intake_submissions\` (
  	\`id\` text(36) PRIMARY KEY NOT NULL,
  	\`form_id\` text(36) NOT NULL,
  	\`channel\` text NOT NULL,
  	\`received_at\` numeric NOT NULL,
  	\`origin\` text NOT NULL,
  	\`ip_hash\` text NOT NULL,
  	\`user_agent\` text NOT NULL,
  	\`payload\` text NOT NULL,
  	\`dedupe_key\` text NOT NULL,
  	\`status\` text NOT NULL,
  	\`record_type\` text,
  	\`record_id\` text,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	FOREIGN KEY (\`form_id\`) REFERENCES \`intake_forms\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `)
  await db.run(sql`CREATE INDEX \`intake_submissions_form_idx\` ON \`intake_submissions\` (\`form_id\`);`)
  await db.run(sql`CREATE INDEX \`intake_submissions_received_at_idx\` ON \`intake_submissions\` (\`received_at\`);`)
  await db.run(sql`CREATE UNIQUE INDEX \`intake_submissions_dedupe_key_idx\` ON \`intake_submissions\` (\`dedupe_key\`);`)
  await db.run(sql`CREATE INDEX \`intake_submissions_updated_at_idx\` ON \`intake_submissions\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`intake_submissions_created_at_idx\` ON \`intake_submissions\` (\`created_at\`);`)
  await db.run(sql`CREATE INDEX \`form_receivedAt_idx\` ON \`intake_submissions\` (\`form_id\`,\`received_at\`);`)
  await db.run(sql`CREATE TABLE \`comments\` (
  	\`id\` text(36) PRIMARY KEY NOT NULL,
  	\`record_type\` text NOT NULL,
  	\`record_id\` text NOT NULL,
  	\`author_id\` text(36) NOT NULL,
  	\`body\` text NOT NULL,
  	\`mentions\` text DEFAULT '[]',
  	\`edited_at\` numeric,
  	\`deleted_at\` numeric,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	FOREIGN KEY (\`author_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `)
  await db.run(sql`CREATE INDEX \`comments_author_idx\` ON \`comments\` (\`author_id\`);`)
  await db.run(sql`CREATE INDEX \`comments_updated_at_idx\` ON \`comments\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`comments_created_at_idx\` ON \`comments\` (\`created_at\`);`)
  await db.run(sql`CREATE INDEX \`recordType_recordId_createdAt_idx\` ON \`comments\` (\`record_type\`,\`record_id\`,\`created_at\`);`)
  await db.run(sql`PRAGMA foreign_keys=OFF;`)
  await db.run(sql`CREATE TABLE \`__new_attachments\` (
  	\`id\` text(36) PRIMARY KEY NOT NULL,
  	\`record_type\` text NOT NULL,
  	\`record_id\` text NOT NULL,
  	\`file_key\` text NOT NULL,
  	\`file_name\` text NOT NULL,
  	\`mime\` text NOT NULL,
  	\`size_bytes\` numeric NOT NULL,
  	\`uploaded_by_id\` text(36) NOT NULL,
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
  await db.run(sql`INSERT INTO \`__new_attachments\`("id", "record_type", "record_id", "file_key", "file_name", "mime", "size_bytes", "uploaded_by_id", "updated_at", "created_at", "url", "thumbnail_u_r_l", "filename", "mime_type", "filesize", "width", "height")
    SELECT "id", "record_type", "record_id", COALESCE("filename", "id"), "file_name", COALESCE("mime_type", 'application/octet-stream'), "size_bytes", COALESCE("uploaded_by_id", (SELECT "id" FROM "users" ORDER BY "created_at" LIMIT 1)), "updated_at", "created_at", "url", "thumbnail_u_r_l", "filename", "mime_type", "filesize", "width", "height"
    FROM \`attachments\`
    WHERE "uploaded_by_id" IS NOT NULL OR EXISTS (SELECT 1 FROM "users");`)
  await db.run(sql`DROP TABLE \`attachments\`;`)
  await db.run(sql`ALTER TABLE \`__new_attachments\` RENAME TO \`attachments\`;`)
  await db.run(sql`PRAGMA foreign_keys=ON;`)
  await db.run(sql`CREATE UNIQUE INDEX \`attachments_file_key_idx\` ON \`attachments\` (\`file_key\`);`)
  await db.run(sql`CREATE INDEX \`attachments_uploaded_by_idx\` ON \`attachments\` (\`uploaded_by_id\`);`)
  await db.run(sql`CREATE INDEX \`attachments_updated_at_idx\` ON \`attachments\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`attachments_created_at_idx\` ON \`attachments\` (\`created_at\`);`)
  await db.run(sql`CREATE UNIQUE INDEX \`attachments_filename_idx\` ON \`attachments\` (\`filename\`);`)
  await db.run(sql`CREATE INDEX \`recordType_recordId_idx\` ON \`attachments\` (\`record_type\`,\`record_id\`);`)
  await db.run(sql`ALTER TABLE \`users\` ADD \`avatar\` text;`)
  await db.run(sql`ALTER TABLE \`users\` ADD \`invitation_id\` text;`)
  await db.run(sql`ALTER TABLE \`payload_locked_documents_rels\` ADD \`invitations_id\` text(36) REFERENCES invitations(id);`)
  await db.run(sql`ALTER TABLE \`payload_locked_documents_rels\` ADD \`field_definitions_id\` text(36) REFERENCES field_definitions(id);`)
  await db.run(sql`ALTER TABLE \`payload_locked_documents_rels\` ADD \`saved_views_id\` text(36) REFERENCES saved_views(id);`)
  await db.run(sql`ALTER TABLE \`payload_locked_documents_rels\` ADD \`layouts_id\` text(36) REFERENCES layouts(id);`)
  await db.run(sql`ALTER TABLE \`payload_locked_documents_rels\` ADD \`notification_prefs_id\` text(36) REFERENCES notification_prefs(id);`)
  await db.run(sql`ALTER TABLE \`payload_locked_documents_rels\` ADD \`intake_forms_id\` text(36) REFERENCES intake_forms(id);`)
  await db.run(sql`ALTER TABLE \`payload_locked_documents_rels\` ADD \`intake_submissions_id\` text(36) REFERENCES intake_submissions(id);`)
  await db.run(sql`ALTER TABLE \`payload_locked_documents_rels\` ADD \`comments_id\` text(36) REFERENCES comments(id);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_invitations_id_idx\` ON \`payload_locked_documents_rels\` (\`invitations_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_field_definitions_id_idx\` ON \`payload_locked_documents_rels\` (\`field_definitions_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_saved_views_id_idx\` ON \`payload_locked_documents_rels\` (\`saved_views_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_layouts_id_idx\` ON \`payload_locked_documents_rels\` (\`layouts_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_notification_prefs_id_idx\` ON \`payload_locked_documents_rels\` (\`notification_prefs_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_intake_forms_id_idx\` ON \`payload_locked_documents_rels\` (\`intake_forms_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_intake_submissions_id_idx\` ON \`payload_locked_documents_rels\` (\`intake_submissions_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_comments_id_idx\` ON \`payload_locked_documents_rels\` (\`comments_id\`);`)
  await db.run(sql`ALTER TABLE \`settings\` ADD \`terminology\` text DEFAULT '{}';`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.run(sql`DROP TABLE \`invitations\`;`)
  await db.run(sql`DROP TABLE \`invitations_rels\`;`)
  await db.run(sql`DROP TABLE \`field_definitions\`;`)
  await db.run(sql`DROP TABLE \`saved_views\`;`)
  await db.run(sql`DROP TABLE \`layouts\`;`)
  await db.run(sql`DROP TABLE \`notification_prefs\`;`)
  await db.run(sql`DROP TABLE \`intake_forms\`;`)
  await db.run(sql`DROP TABLE \`intake_forms_rels\`;`)
  await db.run(sql`DROP TABLE \`intake_submissions\`;`)
  await db.run(sql`DROP TABLE \`comments\`;`)
  await db.run(sql`PRAGMA foreign_keys=OFF;`)
  await db.run(sql`CREATE TABLE \`__new_payload_locked_documents_rels\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`order\` integer,
  	\`parent_id\` text(36) NOT NULL,
  	\`path\` text NOT NULL,
  	\`users_id\` text(36),
  	\`groups_id\` text(36),
  	\`organizations_id\` text(36),
  	\`contacts_id\` text(36),
  	\`leads_id\` text(36),
  	\`deals_id\` text(36),
  	\`projects_id\` text(36),
  	\`tasks_id\` text(36),
  	\`workflows_id\` text(36),
  	\`sources_id\` text(36),
  	\`lost_reasons_id\` text(36),
  	\`activity_id\` text(36),
  	\`stage_transitions_id\` text(36),
  	\`attachments_id\` text(36),
  	\`notifications_id\` text(36),
  	\`email_messages_id\` text(36),
  	\`job_runs_id\` text(36),
  	FOREIGN KEY (\`parent_id\`) REFERENCES \`payload_locked_documents\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`users_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`groups_id\`) REFERENCES \`groups\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`organizations_id\`) REFERENCES \`organizations\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`contacts_id\`) REFERENCES \`contacts\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`leads_id\`) REFERENCES \`leads\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`deals_id\`) REFERENCES \`deals\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`projects_id\`) REFERENCES \`projects\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`tasks_id\`) REFERENCES \`tasks\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`workflows_id\`) REFERENCES \`workflows\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`sources_id\`) REFERENCES \`sources\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`lost_reasons_id\`) REFERENCES \`lost_reasons\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`activity_id\`) REFERENCES \`activity\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`stage_transitions_id\`) REFERENCES \`stage_transitions\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`attachments_id\`) REFERENCES \`attachments\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`notifications_id\`) REFERENCES \`notifications\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`email_messages_id\`) REFERENCES \`email_messages\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`job_runs_id\`) REFERENCES \`job_runs\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`INSERT INTO \`__new_payload_locked_documents_rels\`("id", "order", "parent_id", "path", "users_id", "groups_id", "organizations_id", "contacts_id", "leads_id", "deals_id", "projects_id", "tasks_id", "workflows_id", "sources_id", "lost_reasons_id", "activity_id", "stage_transitions_id", "attachments_id", "notifications_id", "email_messages_id", "job_runs_id") SELECT "id", "order", "parent_id", "path", "users_id", "groups_id", "organizations_id", "contacts_id", "leads_id", "deals_id", "projects_id", "tasks_id", "workflows_id", "sources_id", "lost_reasons_id", "activity_id", "stage_transitions_id", "attachments_id", "notifications_id", "email_messages_id", "job_runs_id" FROM \`payload_locked_documents_rels\`;`)
  await db.run(sql`DROP TABLE \`payload_locked_documents_rels\`;`)
  await db.run(sql`ALTER TABLE \`__new_payload_locked_documents_rels\` RENAME TO \`payload_locked_documents_rels\`;`)
  await db.run(sql`PRAGMA foreign_keys=ON;`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_order_idx\` ON \`payload_locked_documents_rels\` (\`order\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_parent_idx\` ON \`payload_locked_documents_rels\` (\`parent_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_path_idx\` ON \`payload_locked_documents_rels\` (\`path\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_users_id_idx\` ON \`payload_locked_documents_rels\` (\`users_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_groups_id_idx\` ON \`payload_locked_documents_rels\` (\`groups_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_organizations_id_idx\` ON \`payload_locked_documents_rels\` (\`organizations_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_contacts_id_idx\` ON \`payload_locked_documents_rels\` (\`contacts_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_leads_id_idx\` ON \`payload_locked_documents_rels\` (\`leads_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_deals_id_idx\` ON \`payload_locked_documents_rels\` (\`deals_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_projects_id_idx\` ON \`payload_locked_documents_rels\` (\`projects_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_tasks_id_idx\` ON \`payload_locked_documents_rels\` (\`tasks_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_workflows_id_idx\` ON \`payload_locked_documents_rels\` (\`workflows_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_sources_id_idx\` ON \`payload_locked_documents_rels\` (\`sources_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_lost_reasons_id_idx\` ON \`payload_locked_documents_rels\` (\`lost_reasons_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_activity_id_idx\` ON \`payload_locked_documents_rels\` (\`activity_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_stage_transitions_id_idx\` ON \`payload_locked_documents_rels\` (\`stage_transitions_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_attachments_id_idx\` ON \`payload_locked_documents_rels\` (\`attachments_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_notifications_id_idx\` ON \`payload_locked_documents_rels\` (\`notifications_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_email_messages_id_idx\` ON \`payload_locked_documents_rels\` (\`email_messages_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_job_runs_id_idx\` ON \`payload_locked_documents_rels\` (\`job_runs_id\`);`)
  await db.run(sql`CREATE TABLE \`__new_attachments\` (
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
  await db.run(sql`INSERT INTO \`__new_attachments\`("id", "record_type", "record_id", "file_name", "size_bytes", "uploaded_by_id", "updated_at", "created_at", "url", "thumbnail_u_r_l", "filename", "mime_type", "filesize", "width", "height") SELECT "id", "record_type", "record_id", "file_name", "size_bytes", "uploaded_by_id", "updated_at", "created_at", "url", "thumbnail_u_r_l", "filename", "mime_type", "filesize", "width", "height" FROM \`attachments\`;`)
  await db.run(sql`DROP TABLE \`attachments\`;`)
  await db.run(sql`ALTER TABLE \`__new_attachments\` RENAME TO \`attachments\`;`)
  await db.run(sql`CREATE INDEX \`attachments_uploaded_by_idx\` ON \`attachments\` (\`uploaded_by_id\`);`)
  await db.run(sql`CREATE INDEX \`attachments_updated_at_idx\` ON \`attachments\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`attachments_created_at_idx\` ON \`attachments\` (\`created_at\`);`)
  await db.run(sql`CREATE UNIQUE INDEX \`attachments_filename_idx\` ON \`attachments\` (\`filename\`);`)
  await db.run(sql`CREATE INDEX \`recordType_recordId_idx\` ON \`attachments\` (\`record_type\`,\`record_id\`);`)
  await db.run(sql`ALTER TABLE \`users\` DROP COLUMN \`avatar\`;`)
  await db.run(sql`ALTER TABLE \`users\` DROP COLUMN \`invitation_id\`;`)
  await db.run(sql`ALTER TABLE \`settings\` DROP COLUMN \`terminology\`;`)
}
