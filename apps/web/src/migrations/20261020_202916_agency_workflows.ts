import { type MigrateUpArgs, type MigrateDownArgs, sql } from '@payloadcms/db-d1-sqlite'

/** Adds agency records and their lock relations; earlier hand-written migrations already provide the other tables. */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.run(sql`CREATE TABLE \`call_logs\` (
    \`id\` text(36) PRIMARY KEY NOT NULL,
    \`record_type\` text NOT NULL,
    \`record_id\` text NOT NULL,
    \`caller_id\` text(36) NOT NULL,
    \`occurred_at\` numeric NOT NULL,
    \`outcome\` text NOT NULL,
    \`notes\` text,
    \`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
    \`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
    FOREIGN KEY (\`caller_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `)
  await db.run(sql`CREATE INDEX \`call_logs_record_type_idx\` ON \`call_logs\` (\`record_type\`);`)
  await db.run(sql`CREATE INDEX \`call_logs_record_id_idx\` ON \`call_logs\` (\`record_id\`);`)
  await db.run(sql`CREATE INDEX \`call_logs_caller_idx\` ON \`call_logs\` (\`caller_id\`);`)
  await db.run(sql`CREATE INDEX \`call_logs_occurred_at_idx\` ON \`call_logs\` (\`occurred_at\`);`)
  await db.run(sql`CREATE INDEX \`call_logs_updated_at_idx\` ON \`call_logs\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`call_logs_created_at_idx\` ON \`call_logs\` (\`created_at\`);`)
  await db.run(sql`CREATE INDEX \`recordType_recordId_occurredAt_2_idx\` ON \`call_logs\` (\`record_type\`,\`record_id\`,\`occurred_at\`);`)
  await db.run(sql`CREATE TABLE \`deliverables\` (
    \`id\` text(36) PRIMARY KEY NOT NULL,
    \`project_id\` text(36) NOT NULL,
    \`title\` text NOT NULL,
    \`owner_id\` text(36) NOT NULL,
    \`status\` text DEFAULT 'draft' NOT NULL,
    \`link_url\` text,
    \`attachment_id\` text(36),
    \`sent_at\` numeric,
    \`responded_at\` numeric,
    \`responded_by_id\` text(36),
    \`response_note\` text,
    \`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
    \`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
    FOREIGN KEY (\`project_id\`) REFERENCES \`projects\`(\`id\`) ON UPDATE no action ON DELETE set null,
    FOREIGN KEY (\`owner_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE set null,
    FOREIGN KEY (\`attachment_id\`) REFERENCES \`attachments\`(\`id\`) ON UPDATE no action ON DELETE set null,
    FOREIGN KEY (\`responded_by_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `)
  await db.run(sql`CREATE INDEX \`deliverables_project_idx\` ON \`deliverables\` (\`project_id\`);`)
  await db.run(sql`CREATE INDEX \`deliverables_owner_idx\` ON \`deliverables\` (\`owner_id\`);`)
  await db.run(sql`CREATE INDEX \`deliverables_status_idx\` ON \`deliverables\` (\`status\`);`)
  await db.run(sql`CREATE INDEX \`deliverables_attachment_idx\` ON \`deliverables\` (\`attachment_id\`);`)
  await db.run(sql`CREATE INDEX \`deliverables_responded_by_idx\` ON \`deliverables\` (\`responded_by_id\`);`)
  await db.run(sql`CREATE INDEX \`deliverables_updated_at_idx\` ON \`deliverables\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`deliverables_created_at_idx\` ON \`deliverables\` (\`created_at\`);`)
  await db.run(sql`CREATE INDEX \`project_status_updatedAt_idx\` ON \`deliverables\` (\`project_id\`,\`status\`,\`updated_at\`);`)
  await db.run(sql`CREATE TABLE \`content_items\` (
    \`id\` text(36) PRIMARY KEY NOT NULL,
    \`project_id\` text(36) NOT NULL,
    \`title\` text NOT NULL,
    \`body\` text,
    \`channel\` text NOT NULL,
    \`publish_at\` numeric NOT NULL,
    \`status\` text DEFAULT 'draft' NOT NULL,
    \`owner_id\` text(36) NOT NULL,
    \`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
    \`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
    FOREIGN KEY (\`project_id\`) REFERENCES \`projects\`(\`id\`) ON UPDATE no action ON DELETE set null,
    FOREIGN KEY (\`owner_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `)
  await db.run(sql`CREATE INDEX \`content_items_project_idx\` ON \`content_items\` (\`project_id\`);`)
  await db.run(sql`CREATE INDEX \`content_items_publish_at_idx\` ON \`content_items\` (\`publish_at\`);`)
  await db.run(sql`CREATE INDEX \`content_items_status_idx\` ON \`content_items\` (\`status\`);`)
  await db.run(sql`CREATE INDEX \`content_items_owner_idx\` ON \`content_items\` (\`owner_id\`);`)
  await db.run(sql`CREATE INDEX \`content_items_updated_at_idx\` ON \`content_items\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`content_items_created_at_idx\` ON \`content_items\` (\`created_at\`);`)
  await db.run(sql`CREATE INDEX \`publishAt_project_idx\` ON \`content_items\` (\`publish_at\`,\`project_id\`);`)
  await db.run(sql`ALTER TABLE \`payload_locked_documents_rels\` ADD \`call_logs_id\` text(36) REFERENCES call_logs(id);`)
  await db.run(sql`ALTER TABLE \`payload_locked_documents_rels\` ADD \`deliverables_id\` text(36) REFERENCES deliverables(id);`)
  await db.run(sql`ALTER TABLE \`payload_locked_documents_rels\` ADD \`content_items_id\` text(36) REFERENCES content_items(id);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_call_logs_id_idx\` ON \`payload_locked_documents_rels\` (\`call_logs_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_deliverables_id_idx\` ON \`payload_locked_documents_rels\` (\`deliverables_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_content_items_id_idx\` ON \`payload_locked_documents_rels\` (\`content_items_id\`);`)
}

/** Removes only the tables and relations introduced above. */
export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.run(sql`DROP INDEX "payload_locked_documents_rels_call_logs_id_idx";`)
  await db.run(sql`ALTER TABLE payload_locked_documents_rels DROP COLUMN call_logs_id;`)
  await db.run(sql`DROP TABLE call_logs;`)
  await db.run(sql`DROP INDEX "payload_locked_documents_rels_deliverables_id_idx";`)
  await db.run(sql`ALTER TABLE payload_locked_documents_rels DROP COLUMN deliverables_id;`)
  await db.run(sql`DROP TABLE deliverables;`)
  await db.run(sql`DROP INDEX "payload_locked_documents_rels_content_items_id_idx";`)
  await db.run(sql`ALTER TABLE payload_locked_documents_rels DROP COLUMN content_items_id;`)
  await db.run(sql`DROP TABLE content_items;`)
}
