import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-d1-sqlite'

/** Adds the private calendar feed address secret to users; blank until someone turns their feed on. */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.run(sql`ALTER TABLE \`users\` ADD COLUMN \`calendar_token\` text;`)
  await db.run(sql`CREATE INDEX \`users_calendar_token_idx\` ON \`users\` (\`calendar_token\`);`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.run(sql`DROP INDEX \`users_calendar_token_idx\`;`)
  await db.run(sql`ALTER TABLE \`users\` DROP COLUMN \`calendar_token\`;`)
}
