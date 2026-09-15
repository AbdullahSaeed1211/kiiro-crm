import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-d1-sqlite'

/** Adds per-user read receipts to email messages without changing existing message history. */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.run(sql`ALTER TABLE \`email_messages\` ADD COLUMN \`read_by\` text DEFAULT '[]' NOT NULL;`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.run(sql`ALTER TABLE \`email_messages\` DROP COLUMN \`read_by\`;`)
}
