import { sql, type MigrateUpArgs, type MigrateDownArgs } from '@payloadcms/db-d1-sqlite'

/** A nullable unique occurrence identity prevents replay from duplicating monthly work orders. */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.run(sql`ALTER TABLE tasks ADD COLUMN monthly_occurrence_key text`)
  await db.run(sql`CREATE UNIQUE INDEX tasks_monthly_occurrence_key_idx ON tasks(monthly_occurrence_key)`)
}

/** Removes only the occurrence identity field; task records remain intact. */
export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.run(sql`DROP INDEX tasks_monthly_occurrence_key_idx`)
  await db.run(sql`ALTER TABLE tasks DROP COLUMN monthly_occurrence_key`)
}
