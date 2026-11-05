import { sql, type MigrateDownArgs, type MigrateUpArgs } from '@payloadcms/db-d1-sqlite'

/**
 * Adds the automation rules setting and the run history that claims each (rule, record, trigger time) once.
 * A run row is created before its actions, so the unique key is the idempotency claim.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.run(sql`ALTER TABLE \`settings\` ADD COLUMN \`automation_rules\` text DEFAULT '[]';`)
  await db.run(sql`CREATE TABLE \`rule_runs\` (
    \`id\` text(36) PRIMARY KEY NOT NULL,
    \`key\` text NOT NULL,
    \`rule_id\` text NOT NULL,
    \`rule_name\` text NOT NULL,
    \`record_type\` text NOT NULL,
    \`record_id\` text NOT NULL,
    \`trigger\` text NOT NULL,
    \`status\` text DEFAULT 'running' NOT NULL,
    \`started_at\` numeric NOT NULL,
    \`finished_at\` numeric,
    \`actions\` text,
    \`error\` text,
    \`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
    \`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
  );`)
  await db.run(sql`CREATE UNIQUE INDEX \`rule_runs_key_idx\` ON \`rule_runs\` (\`key\`);`)
  await db.run(sql`CREATE INDEX \`rule_runs_status_idx\` ON \`rule_runs\` (\`status\`);`)
  await db.run(sql`CREATE INDEX \`rule_runs_started_at_idx\` ON \`rule_runs\` (\`started_at\`);`)
  await db.run(sql`CREATE INDEX \`rule_runs_updated_at_idx\` ON \`rule_runs\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`rule_runs_created_at_idx\` ON \`rule_runs\` (\`created_at\`);`)
  await db.run(sql`ALTER TABLE \`payload_locked_documents_rels\` ADD \`rule_runs_id\` text(36) REFERENCES rule_runs(id);`)
  await db.run(
    sql`CREATE INDEX \`payload_locked_documents_rels_rule_runs_id_idx\` ON \`payload_locked_documents_rels\` (\`rule_runs_id\`);`,
  )
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.run(sql`DROP INDEX \`payload_locked_documents_rels_rule_runs_id_idx\`;`)
  await db.run(sql`ALTER TABLE \`payload_locked_documents_rels\` DROP COLUMN \`rule_runs_id\`;`)
  await db.run(sql`DROP TABLE \`rule_runs\`;`)
  await db.run(sql`ALTER TABLE \`settings\` DROP COLUMN \`automation_rules\`;`)
}
