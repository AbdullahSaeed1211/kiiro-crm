import { sql, type MigrateDownArgs, type MigrateUpArgs } from '@payloadcms/db-d1-sqlite'

/** Indexed recovery markers keep failed provider cleanup visible to the retry worker. */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.run(sql`ALTER TABLE voice_calls ADD COLUMN recovery_error text`)
  await db.run(sql`UPDATE voice_calls SET recovery_error = json_extract(value, '$.error')`)
  await db.run(sql`CREATE INDEX voice_calls_recovery_error_idx ON voice_calls(recovery_error)`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.run(sql`DROP INDEX voice_calls_recovery_error_idx`)
  await db.run(sql`ALTER TABLE voice_calls DROP COLUMN recovery_error`)
}
