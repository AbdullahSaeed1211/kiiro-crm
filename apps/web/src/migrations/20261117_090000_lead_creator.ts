import { sql, type MigrateDownArgs, type MigrateUpArgs } from '@payloadcms/db-d1-sqlite'

/** Keeps authenticated lead authorship separate from changeable ownership. Legacy authors stay unknown. */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.run(sql`ALTER TABLE leads ADD COLUMN created_by_id text(36)`)
  await db.run(sql`CREATE INDEX leads_created_by_idx ON leads(created_by_id)`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.run(sql`DROP INDEX leads_created_by_idx`)
  await db.run(sql`ALTER TABLE leads DROP COLUMN created_by_id`)
}
