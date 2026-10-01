import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-d1-sqlite'

/** Adds the second sign-in step to users; every account starts without it, so nobody's sign-in changes. */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.run(sql`ALTER TABLE \`users\` ADD COLUMN \`totp_secret\` text;`)
  await db.run(sql`ALTER TABLE \`users\` ADD COLUMN \`totp_enabled\` integer DEFAULT false;`)
  await db.run(sql`ALTER TABLE \`users\` ADD COLUMN \`totp_recovery\` text DEFAULT '[]';`)
  await db.run(sql`ALTER TABLE \`users\` ADD COLUMN \`totp_failures\` numeric DEFAULT 0;`)
  await db.run(sql`ALTER TABLE \`users\` ADD COLUMN \`totp_locked_until\` numeric;`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.run(sql`ALTER TABLE \`users\` DROP COLUMN \`totp_locked_until\`;`)
  await db.run(sql`ALTER TABLE \`users\` DROP COLUMN \`totp_failures\`;`)
  await db.run(sql`ALTER TABLE \`users\` DROP COLUMN \`totp_recovery\`;`)
  await db.run(sql`ALTER TABLE \`users\` DROP COLUMN \`totp_enabled\`;`)
  await db.run(sql`ALTER TABLE \`users\` DROP COLUMN \`totp_secret\`;`)
}
