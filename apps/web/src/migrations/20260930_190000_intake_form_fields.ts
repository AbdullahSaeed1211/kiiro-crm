import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-d1-sqlite'

/** Adds the questions a hosted intake form shows; existing forms have none and keep working as API endpoints. */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.run(sql`ALTER TABLE \`intake_forms\` ADD COLUMN \`form_fields\` text DEFAULT '[]';`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.run(sql`ALTER TABLE \`intake_forms\` DROP COLUMN \`form_fields\`;`)
}
