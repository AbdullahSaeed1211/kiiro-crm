import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-d1-sqlite'

/** Soft delete for organizations, contacts, leads and deals: an archived row keeps its data and gets a `deleted_at` time. */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.run(sql`ALTER TABLE \`organizations\` ADD COLUMN \`deleted_at\` text;`)
  await db.run(sql`CREATE INDEX \`organizations_deleted_at_idx\` ON \`organizations\` (\`deleted_at\`);`)
  await db.run(sql`ALTER TABLE \`contacts\` ADD COLUMN \`deleted_at\` text;`)
  await db.run(sql`CREATE INDEX \`contacts_deleted_at_idx\` ON \`contacts\` (\`deleted_at\`);`)
  await db.run(sql`ALTER TABLE \`leads\` ADD COLUMN \`deleted_at\` text;`)
  await db.run(sql`CREATE INDEX \`leads_deleted_at_idx\` ON \`leads\` (\`deleted_at\`);`)
  await db.run(sql`ALTER TABLE \`deals\` ADD COLUMN \`deleted_at\` text;`)
  await db.run(sql`CREATE INDEX \`deals_deleted_at_idx\` ON \`deals\` (\`deleted_at\`);`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.run(sql`DROP INDEX \`organizations_deleted_at_idx\`;`)
  await db.run(sql`ALTER TABLE \`organizations\` DROP COLUMN \`deleted_at\`;`)
  await db.run(sql`DROP INDEX \`contacts_deleted_at_idx\`;`)
  await db.run(sql`ALTER TABLE \`contacts\` DROP COLUMN \`deleted_at\`;`)
  await db.run(sql`DROP INDEX \`leads_deleted_at_idx\`;`)
  await db.run(sql`ALTER TABLE \`leads\` DROP COLUMN \`deleted_at\`;`)
  await db.run(sql`DROP INDEX \`deals_deleted_at_idx\`;`)
  await db.run(sql`ALTER TABLE \`deals\` DROP COLUMN \`deleted_at\`;`)
}
