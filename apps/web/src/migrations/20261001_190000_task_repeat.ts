import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-d1-sqlite'

/** Adds how a task repeats when completed; every existing task starts as not repeating. */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.run(sql`ALTER TABLE \`tasks\` ADD COLUMN \`repeat\` text DEFAULT 'none' NOT NULL;`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.run(sql`ALTER TABLE \`tasks\` DROP COLUMN \`repeat\`;`)
}
