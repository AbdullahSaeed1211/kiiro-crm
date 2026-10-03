import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-d1-sqlite'

/** Adds the log of security and settings events: access changes, settings saves, tokens and downloads. */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.run(sql`CREATE TABLE \`audit_events\` (
  	\`id\` text(36) PRIMARY KEY NOT NULL,
  	\`verb\` text NOT NULL,
  	\`actor_id\` text(36),
  	\`summary\` text,
  	\`data\` text,
  	\`occurred_at\` numeric NOT NULL,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	FOREIGN KEY (\`actor_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `)
  await db.run(sql`CREATE INDEX \`audit_events_verb_idx\` ON \`audit_events\` (\`verb\`);`)
  await db.run(sql`CREATE INDEX \`audit_events_actor_idx\` ON \`audit_events\` (\`actor_id\`);`)
  await db.run(sql`CREATE INDEX \`audit_events_occurred_at_idx\` ON \`audit_events\` (\`occurred_at\`);`)
  await db.run(sql`CREATE INDEX \`audit_events_updated_at_idx\` ON \`audit_events\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`audit_events_created_at_idx\` ON \`audit_events\` (\`created_at\`);`)
  await db.run(sql`ALTER TABLE \`payload_locked_documents_rels\` ADD \`audit_events_id\` text(36) REFERENCES audit_events(id);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_audit_events_id_idx\` ON \`payload_locked_documents_rels\` (\`audit_events_id\`);`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.run(sql`DROP INDEX \`payload_locked_documents_rels_audit_events_id_idx\`;`)
  await db.run(sql`ALTER TABLE \`payload_locked_documents_rels\` DROP COLUMN \`audit_events_id\`;`)
  await db.run(sql`DROP TABLE \`audit_events\`;`)
}
