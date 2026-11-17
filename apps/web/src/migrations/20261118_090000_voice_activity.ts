import { sql, type MigrateDownArgs, type MigrateUpArgs } from '@payloadcms/db-d1-sqlite'

/** A unique source key keeps retried call wrap-ups from adding duplicate activity. */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.run(sql`ALTER TABLE activity ADD COLUMN source_key text`)
  await db.run(sql`CREATE UNIQUE INDEX activity_source_key_idx ON activity(source_key)`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.run(sql`DROP INDEX activity_source_key_idx`)
  await db.run(sql`ALTER TABLE activity DROP COLUMN source_key`)
}
