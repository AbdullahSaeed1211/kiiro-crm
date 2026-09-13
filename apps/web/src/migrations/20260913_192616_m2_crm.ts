import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-d1-sqlite'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.run(sql`CREATE TABLE \`contacts\` (
  	\`id\` text(36) PRIMARY KEY NOT NULL,
  	\`first_name\` text NOT NULL,
  	\`last_name\` text,
  	\`email\` text,
  	\`phone\` text,
  	\`organization_id\` text(36),
  	\`owner_id\` text(36),
  	\`custom_data\` text,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	FOREIGN KEY (\`organization_id\`) REFERENCES \`organizations\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`owner_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `)
  await db.run(sql`CREATE INDEX \`contacts_email_idx\` ON \`contacts\` (\`email\`);`)
  await db.run(sql`CREATE INDEX \`contacts_organization_idx\` ON \`contacts\` (\`organization_id\`);`)
  await db.run(sql`CREATE INDEX \`contacts_owner_idx\` ON \`contacts\` (\`owner_id\`);`)
  await db.run(sql`CREATE INDEX \`contacts_updated_at_idx\` ON \`contacts\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`contacts_created_at_idx\` ON \`contacts\` (\`created_at\`);`)
  await db.run(sql`CREATE TABLE \`leads\` (
  	\`id\` text(36) PRIMARY KEY NOT NULL,
  	\`title\` text NOT NULL,
  	\`first_name\` text,
  	\`last_name\` text,
  	\`email\` text,
  	\`phone\` text,
  	\`company_name\` text,
  	\`organization_id\` text(36),
  	\`source_id\` text(36),
  	\`owner_id\` text(36),
  	\`workflow_id\` text(36),
  	\`stage_id\` text,
  	\`stage_entered_at\` numeric,
  	\`lost_reason_id\` text(36),
  	\`lost_note\` text,
  	\`converted_at\` numeric,
  	\`converted_deal_id\` text(36),
  	\`custom_data\` text,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	FOREIGN KEY (\`organization_id\`) REFERENCES \`organizations\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`source_id\`) REFERENCES \`sources\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`owner_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`workflow_id\`) REFERENCES \`workflows\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`lost_reason_id\`) REFERENCES \`lost_reasons\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`converted_deal_id\`) REFERENCES \`deals\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `)
  await db.run(sql`CREATE INDEX \`leads_email_idx\` ON \`leads\` (\`email\`);`)
  await db.run(sql`CREATE INDEX \`leads_organization_idx\` ON \`leads\` (\`organization_id\`);`)
  await db.run(sql`CREATE INDEX \`leads_source_idx\` ON \`leads\` (\`source_id\`);`)
  await db.run(sql`CREATE INDEX \`leads_owner_idx\` ON \`leads\` (\`owner_id\`);`)
  await db.run(sql`CREATE INDEX \`leads_workflow_idx\` ON \`leads\` (\`workflow_id\`);`)
  await db.run(sql`CREATE INDEX \`leads_stage_id_idx\` ON \`leads\` (\`stage_id\`);`)
  await db.run(sql`CREATE INDEX \`leads_lost_reason_idx\` ON \`leads\` (\`lost_reason_id\`);`)
  await db.run(sql`CREATE INDEX \`leads_converted_at_idx\` ON \`leads\` (\`converted_at\`);`)
  await db.run(sql`CREATE INDEX \`leads_converted_deal_idx\` ON \`leads\` (\`converted_deal_id\`);`)
  await db.run(sql`CREATE INDEX \`leads_updated_at_idx\` ON \`leads\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`leads_created_at_idx\` ON \`leads\` (\`created_at\`);`)
  await db.run(sql`CREATE TABLE \`leads_rels\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`order\` integer,
  	\`parent_id\` text(36) NOT NULL,
  	\`path\` text NOT NULL,
  	\`users_id\` text(36),
  	FOREIGN KEY (\`parent_id\`) REFERENCES \`leads\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`users_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`leads_rels_order_idx\` ON \`leads_rels\` (\`order\`);`)
  await db.run(sql`CREATE INDEX \`leads_rels_parent_idx\` ON \`leads_rels\` (\`parent_id\`);`)
  await db.run(sql`CREATE INDEX \`leads_rels_path_idx\` ON \`leads_rels\` (\`path\`);`)
  await db.run(sql`CREATE INDEX \`leads_rels_users_id_idx\` ON \`leads_rels\` (\`users_id\`);`)
  await db.run(sql`CREATE TABLE \`deals\` (
  	\`id\` text(36) PRIMARY KEY NOT NULL,
  	\`title\` text NOT NULL,
  	\`organization_id\` text(36),
  	\`primary_contact_id\` text(36),
  	\`value_amount_minor\` numeric,
  	\`value_currency\` text,
  	\`expected_close_at\` numeric,
  	\`closed_at\` numeric,
  	\`owner_id\` text(36),
  	\`workflow_id\` text(36),
  	\`stage_id\` text,
  	\`stage_entered_at\` numeric,
  	\`source_lead_id\` text(36),
  	\`lost_reason_id\` text(36),
  	\`lost_note\` text,
  	\`custom_data\` text,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	FOREIGN KEY (\`organization_id\`) REFERENCES \`organizations\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`primary_contact_id\`) REFERENCES \`contacts\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`owner_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`workflow_id\`) REFERENCES \`workflows\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`source_lead_id\`) REFERENCES \`leads\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`lost_reason_id\`) REFERENCES \`lost_reasons\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `)
  await db.run(sql`CREATE INDEX \`deals_organization_idx\` ON \`deals\` (\`organization_id\`);`)
  await db.run(sql`CREATE INDEX \`deals_primary_contact_idx\` ON \`deals\` (\`primary_contact_id\`);`)
  await db.run(sql`CREATE INDEX \`deals_expected_close_at_idx\` ON \`deals\` (\`expected_close_at\`);`)
  await db.run(sql`CREATE INDEX \`deals_owner_idx\` ON \`deals\` (\`owner_id\`);`)
  await db.run(sql`CREATE INDEX \`deals_workflow_idx\` ON \`deals\` (\`workflow_id\`);`)
  await db.run(sql`CREATE INDEX \`deals_stage_id_idx\` ON \`deals\` (\`stage_id\`);`)
  await db.run(sql`CREATE INDEX \`deals_source_lead_idx\` ON \`deals\` (\`source_lead_id\`);`)
  await db.run(sql`CREATE INDEX \`deals_lost_reason_idx\` ON \`deals\` (\`lost_reason_id\`);`)
  await db.run(sql`CREATE INDEX \`deals_updated_at_idx\` ON \`deals\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`deals_created_at_idx\` ON \`deals\` (\`created_at\`);`)
  await db.run(sql`CREATE TABLE \`deals_rels\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`order\` integer,
  	\`parent_id\` text(36) NOT NULL,
  	\`path\` text NOT NULL,
  	\`contacts_id\` text(36),
  	\`users_id\` text(36),
  	FOREIGN KEY (\`parent_id\`) REFERENCES \`deals\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`contacts_id\`) REFERENCES \`contacts\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`users_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`deals_rels_order_idx\` ON \`deals_rels\` (\`order\`);`)
  await db.run(sql`CREATE INDEX \`deals_rels_parent_idx\` ON \`deals_rels\` (\`parent_id\`);`)
  await db.run(sql`CREATE INDEX \`deals_rels_path_idx\` ON \`deals_rels\` (\`path\`);`)
  await db.run(sql`CREATE INDEX \`deals_rels_contacts_id_idx\` ON \`deals_rels\` (\`contacts_id\`);`)
  await db.run(sql`CREATE INDEX \`deals_rels_users_id_idx\` ON \`deals_rels\` (\`users_id\`);`)
  await db.run(sql`CREATE TABLE \`sources\` (
  	\`id\` text(36) PRIMARY KEY NOT NULL,
  	\`name\` text NOT NULL,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
  );
  `)
  await db.run(sql`CREATE UNIQUE INDEX \`sources_name_idx\` ON \`sources\` (\`name\`);`)
  await db.run(sql`CREATE INDEX \`sources_updated_at_idx\` ON \`sources\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`sources_created_at_idx\` ON \`sources\` (\`created_at\`);`)
  await db.run(sql`CREATE TABLE \`lost_reasons\` (
  	\`id\` text(36) PRIMARY KEY NOT NULL,
  	\`name\` text NOT NULL,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
  );
  `)
  await db.run(sql`CREATE UNIQUE INDEX \`lost_reasons_name_idx\` ON \`lost_reasons\` (\`name\`);`)
  await db.run(sql`CREATE INDEX \`lost_reasons_updated_at_idx\` ON \`lost_reasons\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`lost_reasons_created_at_idx\` ON \`lost_reasons\` (\`created_at\`);`)
  await db.run(sql`CREATE TABLE \`stage_transitions\` (
  	\`id\` text(36) PRIMARY KEY NOT NULL,
  	\`record_type\` text NOT NULL,
  	\`record_id\` text NOT NULL,
  	\`workflow_id\` text(36) NOT NULL,
  	\`from_stage_id\` text NOT NULL,
  	\`to_stage_id\` text NOT NULL,
  	\`from_category\` text NOT NULL,
  	\`to_category\` text NOT NULL,
  	\`changed_by_id\` text(36),
  	\`changed_at\` numeric NOT NULL,
  	\`duration_ms\` numeric NOT NULL,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	FOREIGN KEY (\`workflow_id\`) REFERENCES \`workflows\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`changed_by_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `)
  await db.run(sql`CREATE INDEX \`stage_transitions_workflow_idx\` ON \`stage_transitions\` (\`workflow_id\`);`)
  await db.run(sql`CREATE INDEX \`stage_transitions_changed_by_idx\` ON \`stage_transitions\` (\`changed_by_id\`);`)
  await db.run(sql`CREATE INDEX \`stage_transitions_updated_at_idx\` ON \`stage_transitions\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`stage_transitions_created_at_idx\` ON \`stage_transitions\` (\`created_at\`);`)
  await db.run(sql`CREATE INDEX \`recordType_recordId_changedAt_idx\` ON \`stage_transitions\` (\`record_type\`,\`record_id\`,\`changed_at\`);`)
  await db.run(sql`ALTER TABLE \`organizations\` ADD \`source_id\` text(36) REFERENCES sources(id);`)
  await db.run(sql`CREATE INDEX \`organizations_source_idx\` ON \`organizations\` (\`source_id\`);`)
  await db.run(sql`ALTER TABLE \`payload_locked_documents_rels\` ADD \`contacts_id\` text(36) REFERENCES contacts(id);`)
  await db.run(sql`ALTER TABLE \`payload_locked_documents_rels\` ADD \`leads_id\` text(36) REFERENCES leads(id);`)
  await db.run(sql`ALTER TABLE \`payload_locked_documents_rels\` ADD \`deals_id\` text(36) REFERENCES deals(id);`)
  await db.run(sql`ALTER TABLE \`payload_locked_documents_rels\` ADD \`sources_id\` text(36) REFERENCES sources(id);`)
  await db.run(sql`ALTER TABLE \`payload_locked_documents_rels\` ADD \`lost_reasons_id\` text(36) REFERENCES lost_reasons(id);`)
  await db.run(sql`ALTER TABLE \`payload_locked_documents_rels\` ADD \`stage_transitions_id\` text(36) REFERENCES stage_transitions(id);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_contacts_id_idx\` ON \`payload_locked_documents_rels\` (\`contacts_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_leads_id_idx\` ON \`payload_locked_documents_rels\` (\`leads_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_deals_id_idx\` ON \`payload_locked_documents_rels\` (\`deals_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_sources_id_idx\` ON \`payload_locked_documents_rels\` (\`sources_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_lost_reasons_id_idx\` ON \`payload_locked_documents_rels\` (\`lost_reasons_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_stage_transitions_id_idx\` ON \`payload_locked_documents_rels\` (\`stage_transitions_id\`);`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.run(sql`DROP TABLE \`contacts\`;`)
  await db.run(sql`DROP TABLE \`leads\`;`)
  await db.run(sql`DROP TABLE \`leads_rels\`;`)
  await db.run(sql`DROP TABLE \`deals\`;`)
  await db.run(sql`DROP TABLE \`deals_rels\`;`)
  await db.run(sql`DROP TABLE \`sources\`;`)
  await db.run(sql`DROP TABLE \`lost_reasons\`;`)
  await db.run(sql`DROP TABLE \`stage_transitions\`;`)
  await db.run(sql`PRAGMA foreign_keys=OFF;`)
  await db.run(sql`CREATE TABLE \`__new_organizations\` (
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
  await db.run(sql`INSERT INTO \`__new_organizations\`("id", "name", "website", "phone", "email", "owner_id", "custom_data", "updated_at", "created_at") SELECT "id", "name", "website", "phone", "email", "owner_id", "custom_data", "updated_at", "created_at" FROM \`organizations\`;`)
  await db.run(sql`DROP TABLE \`organizations\`;`)
  await db.run(sql`ALTER TABLE \`__new_organizations\` RENAME TO \`organizations\`;`)
  await db.run(sql`PRAGMA foreign_keys=ON;`)
  await db.run(sql`CREATE INDEX \`organizations_name_idx\` ON \`organizations\` (\`name\`);`)
  await db.run(sql`CREATE INDEX \`organizations_owner_idx\` ON \`organizations\` (\`owner_id\`);`)
  await db.run(sql`CREATE INDEX \`organizations_updated_at_idx\` ON \`organizations\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`organizations_created_at_idx\` ON \`organizations\` (\`created_at\`);`)
  await db.run(sql`CREATE TABLE \`__new_payload_locked_documents_rels\` (
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
  await db.run(sql`INSERT INTO \`__new_payload_locked_documents_rels\`("id", "order", "parent_id", "path", "users_id", "groups_id", "organizations_id", "projects_id", "tasks_id", "workflows_id", "activity_id", "attachments_id", "notifications_id", "email_messages_id", "job_runs_id") SELECT "id", "order", "parent_id", "path", "users_id", "groups_id", "organizations_id", "projects_id", "tasks_id", "workflows_id", "activity_id", "attachments_id", "notifications_id", "email_messages_id", "job_runs_id" FROM \`payload_locked_documents_rels\`;`)
  await db.run(sql`DROP TABLE \`payload_locked_documents_rels\`;`)
  await db.run(sql`ALTER TABLE \`__new_payload_locked_documents_rels\` RENAME TO \`payload_locked_documents_rels\`;`)
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
}
