import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-d1-sqlite'

/** Adds time entries: minutes someone logged against a task on a day. */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.run(sql`CREATE TABLE \`time_entries\` (
  	\`id\` text(36) PRIMARY KEY NOT NULL,
  	\`task_id\` text(36) NOT NULL,
  	\`user_id\` text(36) NOT NULL,
  	\`minutes\` numeric NOT NULL,
  	\`day\` numeric NOT NULL,
  	\`note\` text,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	FOREIGN KEY (\`task_id\`) REFERENCES \`tasks\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `)
  await db.run(sql`CREATE INDEX \`time_entries_task_idx\` ON \`time_entries\` (\`task_id\`);`)
  await db.run(sql`CREATE INDEX \`time_entries_user_idx\` ON \`time_entries\` (\`user_id\`);`)
  await db.run(sql`CREATE INDEX \`time_entries_day_idx\` ON \`time_entries\` (\`day\`);`)
  await db.run(sql`CREATE INDEX \`time_entries_updated_at_idx\` ON \`time_entries\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`time_entries_created_at_idx\` ON \`time_entries\` (\`created_at\`);`)
  await db.run(sql`ALTER TABLE \`payload_locked_documents_rels\` ADD \`time_entries_id\` text(36) REFERENCES time_entries(id);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_time_entries_id_idx\` ON \`payload_locked_documents_rels\` (\`time_entries_id\`);`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.run(sql`DROP INDEX \`payload_locked_documents_rels_time_entries_id_idx\`;`)
  await db.run(sql`ALTER TABLE \`payload_locked_documents_rels\` DROP COLUMN \`time_entries_id\`;`)
  await db.run(sql`DROP TABLE \`time_entries\`;`)
}
