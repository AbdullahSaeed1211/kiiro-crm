import { sql, type MigrateDownArgs, type MigrateUpArgs } from '@payloadcms/db-d1-sqlite'

/** Stores one explicit current task focus per user, separately from time entries. */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.run(sql`CREATE TABLE current_focus (
    id text(36) PRIMARY KEY NOT NULL,
    user_id text(36) NOT NULL REFERENCES users(id) ON UPDATE no action ON DELETE cascade,
    task_id text(36) NOT NULL REFERENCES tasks(id) ON UPDATE no action ON DELETE cascade,
    started_at numeric NOT NULL,
    updated_at text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
    created_at text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
  )`)
  await db.run(sql`CREATE UNIQUE INDEX current_focus_user_idx ON current_focus(user_id)`)
  await db.run(sql`CREATE INDEX current_focus_task_idx ON current_focus(task_id)`)
  await db.run(sql`CREATE INDEX current_focus_started_at_idx ON current_focus(started_at)`)
  await db.run(sql`CREATE INDEX current_focus_updated_at_idx ON current_focus(updated_at)`)
  await db.run(sql`CREATE INDEX current_focus_created_at_idx ON current_focus(created_at)`)
  await db.run(sql`ALTER TABLE payload_locked_documents_rels ADD current_focus_id text(36) REFERENCES current_focus(id)`)
  await db.run(sql`CREATE INDEX payload_locked_documents_rels_current_focus_id_idx ON payload_locked_documents_rels(current_focus_id)`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.run(sql`DROP INDEX payload_locked_documents_rels_current_focus_id_idx`)
  await db.run(sql`ALTER TABLE payload_locked_documents_rels DROP COLUMN current_focus_id`)
  await db.run(sql`DROP TABLE current_focus`)
}
