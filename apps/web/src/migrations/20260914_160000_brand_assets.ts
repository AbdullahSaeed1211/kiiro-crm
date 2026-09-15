import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-d1-sqlite'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.run(sql`ALTER TABLE \`settings\` ADD \`logo_file_key\` text;`)
  await db.run(sql`ALTER TABLE \`settings\` ADD \`favicon_file_key\` text;`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.run(sql`ALTER TABLE \`settings\` DROP COLUMN \`logo_file_key\`;`)
  await db.run(sql`ALTER TABLE \`settings\` DROP COLUMN \`favicon_file_key\`;`)
}
