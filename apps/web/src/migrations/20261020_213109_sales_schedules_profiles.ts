import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-d1-sqlite'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.run(sql`CREATE TABLE \`schedule_items\` (
    \`id\` text(36) PRIMARY KEY NOT NULL,
    \`kind\` text NOT NULL,
    \`record_type\` text NOT NULL,
    \`record_id\` text NOT NULL,
    \`starts_at\` numeric NOT NULL,
    \`status\` text DEFAULT 'scheduled' NOT NULL,
    \`title\` text,
    \`notes\` text,
    \`source_key\` text,
    \`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
    \`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
  );
  `)
  await db.run(sql`CREATE INDEX \`schedule_items_kind_idx\` ON \`schedule_items\` (\`kind\`);`)
  await db.run(sql`CREATE INDEX \`schedule_items_record_type_idx\` ON \`schedule_items\` (\`record_type\`);`)
  await db.run(sql`CREATE INDEX \`schedule_items_record_id_idx\` ON \`schedule_items\` (\`record_id\`);`)
  await db.run(sql`CREATE INDEX \`schedule_items_starts_at_idx\` ON \`schedule_items\` (\`starts_at\`);`)
  await db.run(sql`CREATE INDEX \`schedule_items_status_idx\` ON \`schedule_items\` (\`status\`);`)
  await db.run(sql`CREATE UNIQUE INDEX \`schedule_items_source_key_idx\` ON \`schedule_items\` (\`source_key\`);`)
  await db.run(sql`CREATE INDEX \`schedule_items_updated_at_idx\` ON \`schedule_items\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`schedule_items_created_at_idx\` ON \`schedule_items\` (\`created_at\`);`)
  await db.run(sql`CREATE INDEX \`recordType_recordId_startsAt_idx\` ON \`schedule_items\` (\`record_type\`,\`record_id\`,\`starts_at\`);`)
  await db.run(sql`CREATE INDEX \`startsAt_status_idx\` ON \`schedule_items\` (\`starts_at\`,\`status\`);`)
  await db.run(sql`CREATE TABLE \`schedule_items_rels\` (
    \`id\` integer PRIMARY KEY NOT NULL,
    \`order\` integer,
    \`parent_id\` text(36) NOT NULL,
    \`path\` text NOT NULL,
    \`users_id\` text(36),
    FOREIGN KEY (\`parent_id\`) REFERENCES \`schedule_items\`(\`id\`) ON UPDATE no action ON DELETE cascade,
    FOREIGN KEY (\`users_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`schedule_items_rels_order_idx\` ON \`schedule_items_rels\` (\`order\`);`)
  await db.run(sql`CREATE INDEX \`schedule_items_rels_parent_idx\` ON \`schedule_items_rels\` (\`parent_id\`);`)
  await db.run(sql`CREATE INDEX \`schedule_items_rels_path_idx\` ON \`schedule_items_rels\` (\`path\`);`)
  await db.run(sql`CREATE INDEX \`schedule_items_rels_users_id_idx\` ON \`schedule_items_rels\` (\`users_id\`);`)
  await db.run(sql`ALTER TABLE \`users\` ADD \`work_profile\` text DEFAULT 'delivery' NOT NULL;`)
  await db.run(sql`CREATE INDEX \`users_work_profile_idx\` ON \`users\` (\`work_profile\`);`)
  await db.run(sql`ALTER TABLE \`payload_locked_documents_rels\` ADD \`schedule_items_id\` text(36) REFERENCES schedule_items(id);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_schedule_items_id_idx\` ON \`payload_locked_documents_rels\` (\`schedule_items_id\`);`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.run(sql`DROP TABLE \`schedule_items\`;`)
  await db.run(sql`DROP TABLE \`schedule_items_rels\`;`)
  await db.run(sql`PRAGMA foreign_keys=OFF;`)
  await db.run(sql`CREATE TABLE \`__new_payload_locked_documents_rels\` (
    \`id\` integer PRIMARY KEY NOT NULL,
    \`order\` integer,
    \`parent_id\` text(36) NOT NULL,
    \`path\` text NOT NULL,
    \`users_id\` text(36),
    \`groups_id\` text(36),
    \`invitations_id\` text(36),
    \`organizations_id\` text(36),
    \`contacts_id\` text(36),
    \`leads_id\` text(36),
    \`deals_id\` text(36),
    \`projects_id\` text(36),
    \`tasks_id\` text(36),
    \`workflows_id\` text(36),
    \`field_definitions_id\` text(36),
    \`saved_views_id\` text(36),
    \`layouts_id\` text(36),
    \`sources_id\` text(36),
    \`lost_reasons_id\` text(36),
    \`notification_prefs_id\` text(36),
    \`intake_forms_id\` text(36),
    \`intake_submissions_id\` text(36),
    \`activity_id\` text(36),
    \`stage_transitions_id\` text(36),
    \`comments_id\` text(36),
    \`attachments_id\` text(36),
    \`notifications_id\` text(36),
    \`email_messages_id\` text(36),
    \`job_runs_id\` text(36),
    \`time_entries_id\` text(36),
    \`webhook_deliveries_id\` text(36),
    \`demo_manifests_id\` text(36),
    \`audit_events_id\` text(36),
    \`billing_documents_id\` text(36),
    \`campaign_queue_id\` text(36),
    \`call_logs_id\` text(36),
    \`deliverables_id\` text(36),
    \`content_items_id\` text(36),
    FOREIGN KEY (\`parent_id\`) REFERENCES \`payload_locked_documents\`(\`id\`) ON UPDATE no action ON DELETE cascade,
    FOREIGN KEY (\`users_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE cascade,
    FOREIGN KEY (\`groups_id\`) REFERENCES \`groups\`(\`id\`) ON UPDATE no action ON DELETE cascade,
    FOREIGN KEY (\`invitations_id\`) REFERENCES \`invitations\`(\`id\`) ON UPDATE no action ON DELETE cascade,
    FOREIGN KEY (\`organizations_id\`) REFERENCES \`organizations\`(\`id\`) ON UPDATE no action ON DELETE cascade,
    FOREIGN KEY (\`contacts_id\`) REFERENCES \`contacts\`(\`id\`) ON UPDATE no action ON DELETE cascade,
    FOREIGN KEY (\`leads_id\`) REFERENCES \`leads\`(\`id\`) ON UPDATE no action ON DELETE cascade,
    FOREIGN KEY (\`deals_id\`) REFERENCES \`deals\`(\`id\`) ON UPDATE no action ON DELETE cascade,
    FOREIGN KEY (\`projects_id\`) REFERENCES \`projects\`(\`id\`) ON UPDATE no action ON DELETE cascade,
    FOREIGN KEY (\`tasks_id\`) REFERENCES \`tasks\`(\`id\`) ON UPDATE no action ON DELETE cascade,
    FOREIGN KEY (\`workflows_id\`) REFERENCES \`workflows\`(\`id\`) ON UPDATE no action ON DELETE cascade,
    FOREIGN KEY (\`field_definitions_id\`) REFERENCES \`field_definitions\`(\`id\`) ON UPDATE no action ON DELETE cascade,
    FOREIGN KEY (\`saved_views_id\`) REFERENCES \`saved_views\`(\`id\`) ON UPDATE no action ON DELETE cascade,
    FOREIGN KEY (\`layouts_id\`) REFERENCES \`layouts\`(\`id\`) ON UPDATE no action ON DELETE cascade,
    FOREIGN KEY (\`sources_id\`) REFERENCES \`sources\`(\`id\`) ON UPDATE no action ON DELETE cascade,
    FOREIGN KEY (\`lost_reasons_id\`) REFERENCES \`lost_reasons\`(\`id\`) ON UPDATE no action ON DELETE cascade,
    FOREIGN KEY (\`notification_prefs_id\`) REFERENCES \`notification_prefs\`(\`id\`) ON UPDATE no action ON DELETE cascade,
    FOREIGN KEY (\`intake_forms_id\`) REFERENCES \`intake_forms\`(\`id\`) ON UPDATE no action ON DELETE cascade,
    FOREIGN KEY (\`intake_submissions_id\`) REFERENCES \`intake_submissions\`(\`id\`) ON UPDATE no action ON DELETE cascade,
    FOREIGN KEY (\`activity_id\`) REFERENCES \`activity\`(\`id\`) ON UPDATE no action ON DELETE cascade,
    FOREIGN KEY (\`stage_transitions_id\`) REFERENCES \`stage_transitions\`(\`id\`) ON UPDATE no action ON DELETE cascade,
    FOREIGN KEY (\`comments_id\`) REFERENCES \`comments\`(\`id\`) ON UPDATE no action ON DELETE cascade,
    FOREIGN KEY (\`attachments_id\`) REFERENCES \`attachments\`(\`id\`) ON UPDATE no action ON DELETE cascade,
    FOREIGN KEY (\`notifications_id\`) REFERENCES \`notifications\`(\`id\`) ON UPDATE no action ON DELETE cascade,
    FOREIGN KEY (\`email_messages_id\`) REFERENCES \`email_messages\`(\`id\`) ON UPDATE no action ON DELETE cascade,
    FOREIGN KEY (\`job_runs_id\`) REFERENCES \`job_runs\`(\`id\`) ON UPDATE no action ON DELETE cascade,
    FOREIGN KEY (\`time_entries_id\`) REFERENCES \`time_entries\`(\`id\`) ON UPDATE no action ON DELETE cascade,
    FOREIGN KEY (\`webhook_deliveries_id\`) REFERENCES \`webhook_deliveries\`(\`id\`) ON UPDATE no action ON DELETE cascade,
    FOREIGN KEY (\`demo_manifests_id\`) REFERENCES \`demo_manifests\`(\`id\`) ON UPDATE no action ON DELETE cascade,
    FOREIGN KEY (\`audit_events_id\`) REFERENCES \`audit_events\`(\`id\`) ON UPDATE no action ON DELETE cascade,
    FOREIGN KEY (\`billing_documents_id\`) REFERENCES \`billing_documents\`(\`id\`) ON UPDATE no action ON DELETE cascade,
    FOREIGN KEY (\`campaign_queue_id\`) REFERENCES \`campaign_queue\`(\`id\`) ON UPDATE no action ON DELETE cascade,
    FOREIGN KEY (\`call_logs_id\`) REFERENCES \`call_logs\`(\`id\`) ON UPDATE no action ON DELETE cascade,
    FOREIGN KEY (\`deliverables_id\`) REFERENCES \`deliverables\`(\`id\`) ON UPDATE no action ON DELETE cascade,
    FOREIGN KEY (\`content_items_id\`) REFERENCES \`content_items\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`INSERT INTO \`__new_payload_locked_documents_rels\`("id", "order", "parent_id", "path", "users_id", "groups_id", "invitations_id", "organizations_id", "contacts_id", "leads_id", "deals_id", "projects_id", "tasks_id", "workflows_id", "field_definitions_id", "saved_views_id", "layouts_id", "sources_id", "lost_reasons_id", "notification_prefs_id", "intake_forms_id", "intake_submissions_id", "activity_id", "stage_transitions_id", "comments_id", "attachments_id", "notifications_id", "email_messages_id", "job_runs_id", "time_entries_id", "webhook_deliveries_id", "demo_manifests_id", "audit_events_id", "billing_documents_id", "campaign_queue_id", "call_logs_id", "deliverables_id", "content_items_id") SELECT "id", "order", "parent_id", "path", "users_id", "groups_id", "invitations_id", "organizations_id", "contacts_id", "leads_id", "deals_id", "projects_id", "tasks_id", "workflows_id", "field_definitions_id", "saved_views_id", "layouts_id", "sources_id", "lost_reasons_id", "notification_prefs_id", "intake_forms_id", "intake_submissions_id", "activity_id", "stage_transitions_id", "comments_id", "attachments_id", "notifications_id", "email_messages_id", "job_runs_id", "time_entries_id", "webhook_deliveries_id", "demo_manifests_id", "audit_events_id", "billing_documents_id", "campaign_queue_id", "call_logs_id", "deliverables_id", "content_items_id" FROM \`payload_locked_documents_rels\`;`)
  await db.run(sql`DROP TABLE \`payload_locked_documents_rels\`;`)
  await db.run(sql`ALTER TABLE \`__new_payload_locked_documents_rels\` RENAME TO \`payload_locked_documents_rels\`;`)
  await db.run(sql`PRAGMA foreign_keys=ON;`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_order_idx\` ON \`payload_locked_documents_rels\` (\`order\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_parent_idx\` ON \`payload_locked_documents_rels\` (\`parent_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_path_idx\` ON \`payload_locked_documents_rels\` (\`path\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_users_id_idx\` ON \`payload_locked_documents_rels\` (\`users_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_groups_id_idx\` ON \`payload_locked_documents_rels\` (\`groups_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_invitations_id_idx\` ON \`payload_locked_documents_rels\` (\`invitations_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_organizations_id_idx\` ON \`payload_locked_documents_rels\` (\`organizations_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_contacts_id_idx\` ON \`payload_locked_documents_rels\` (\`contacts_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_leads_id_idx\` ON \`payload_locked_documents_rels\` (\`leads_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_deals_id_idx\` ON \`payload_locked_documents_rels\` (\`deals_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_projects_id_idx\` ON \`payload_locked_documents_rels\` (\`projects_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_tasks_id_idx\` ON \`payload_locked_documents_rels\` (\`tasks_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_workflows_id_idx\` ON \`payload_locked_documents_rels\` (\`workflows_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_field_definitions_id_idx\` ON \`payload_locked_documents_rels\` (\`field_definitions_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_saved_views_id_idx\` ON \`payload_locked_documents_rels\` (\`saved_views_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_layouts_id_idx\` ON \`payload_locked_documents_rels\` (\`layouts_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_sources_id_idx\` ON \`payload_locked_documents_rels\` (\`sources_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_lost_reasons_id_idx\` ON \`payload_locked_documents_rels\` (\`lost_reasons_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_notification_prefs_id_idx\` ON \`payload_locked_documents_rels\` (\`notification_prefs_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_intake_forms_id_idx\` ON \`payload_locked_documents_rels\` (\`intake_forms_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_intake_submissions_id_idx\` ON \`payload_locked_documents_rels\` (\`intake_submissions_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_activity_id_idx\` ON \`payload_locked_documents_rels\` (\`activity_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_stage_transitions_id_idx\` ON \`payload_locked_documents_rels\` (\`stage_transitions_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_comments_id_idx\` ON \`payload_locked_documents_rels\` (\`comments_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_attachments_id_idx\` ON \`payload_locked_documents_rels\` (\`attachments_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_notifications_id_idx\` ON \`payload_locked_documents_rels\` (\`notifications_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_email_messages_id_idx\` ON \`payload_locked_documents_rels\` (\`email_messages_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_job_runs_id_idx\` ON \`payload_locked_documents_rels\` (\`job_runs_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_time_entries_id_idx\` ON \`payload_locked_documents_rels\` (\`time_entries_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_webhook_deliveries_id_idx\` ON \`payload_locked_documents_rels\` (\`webhook_deliveries_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_demo_manifests_id_idx\` ON \`payload_locked_documents_rels\` (\`demo_manifests_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_audit_events_id_idx\` ON \`payload_locked_documents_rels\` (\`audit_events_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_billing_documents_id_idx\` ON \`payload_locked_documents_rels\` (\`billing_documents_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_campaign_queue_id_idx\` ON \`payload_locked_documents_rels\` (\`campaign_queue_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_call_logs_id_idx\` ON \`payload_locked_documents_rels\` (\`call_logs_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_deliverables_id_idx\` ON \`payload_locked_documents_rels\` (\`deliverables_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_content_items_id_idx\` ON \`payload_locked_documents_rels\` (\`content_items_id\`);`)
  await db.run(sql`DROP INDEX \`users_work_profile_idx\`;`)
  await db.run(sql`ALTER TABLE \`users\` DROP COLUMN \`work_profile\`;`)
}
