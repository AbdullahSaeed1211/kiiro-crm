import { sql, type MigrateDownArgs, type MigrateUpArgs } from '@payloadcms/db-d1-sqlite'

/** Persists per-user intent for a workspace calendar day independently from task due dates. */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.run(sql`CREATE TABLE task_day_plans (
    id text(36) PRIMARY KEY NOT NULL,
    user_id text(36) NOT NULL REFERENCES users(id),
    task_id text(36) NOT NULL REFERENCES tasks(id),
    day numeric NOT NULL,
    updated_at text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
    created_at text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
  )`)
  await db.run(sql`CREATE INDEX task_day_plans_user_idx ON task_day_plans(user_id)`)
  await db.run(sql`CREATE INDEX task_day_plans_task_idx ON task_day_plans(task_id)`)
  await db.run(sql`CREATE INDEX task_day_plans_day_idx ON task_day_plans(day)`)
  await db.run(sql`CREATE INDEX task_day_plans_updated_at_idx ON task_day_plans(updated_at)`)
  await db.run(sql`CREATE INDEX task_day_plans_created_at_idx ON task_day_plans(created_at)`)
  await db.run(sql`CREATE UNIQUE INDEX user_day_task_idx ON task_day_plans(user_id, day, task_id)`)
  await db.run(sql`ALTER TABLE payload_locked_documents_rels ADD task_day_plans_id text(36) REFERENCES task_day_plans(id)`)
  await db.run(
    sql`CREATE INDEX payload_locked_documents_rels_task_day_plans_id_idx ON payload_locked_documents_rels(task_day_plans_id)`,
  )
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.run(sql`DROP INDEX payload_locked_documents_rels_task_day_plans_id_idx`)
  await db.run(sql`ALTER TABLE payload_locked_documents_rels DROP COLUMN task_day_plans_id`)
  await db.run(sql`DROP TABLE task_day_plans`)
}
