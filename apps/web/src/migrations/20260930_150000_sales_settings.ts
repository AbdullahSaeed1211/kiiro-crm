import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-d1-sqlite'

/** Adds the first-response target, email templates and lead assignment rules to tenant settings; all start off/empty. */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.run(sql`ALTER TABLE \`settings\` ADD COLUMN \`response_target_hours\` numeric DEFAULT 0;`)
  await db.run(sql`ALTER TABLE \`settings\` ADD COLUMN \`email_templates\` text DEFAULT '[]';`)
  await db.run(sql`ALTER TABLE \`settings\` ADD COLUMN \`automations\` text DEFAULT '[]';`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.run(sql`ALTER TABLE \`settings\` DROP COLUMN \`automations\`;`)
  await db.run(sql`ALTER TABLE \`settings\` DROP COLUMN \`email_templates\`;`)
  await db.run(sql`ALTER TABLE \`settings\` DROP COLUMN \`response_target_hours\`;`)
}
