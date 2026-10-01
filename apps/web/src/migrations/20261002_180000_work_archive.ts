import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-d1-sqlite'

/** Soft delete for tasks and projects: an archived row keeps its data and gets a `deleted_at` time. */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.run(sql`ALTER TABLE \`tasks\` ADD COLUMN \`deleted_at\` text;`)
  await db.run(sql`CREATE INDEX \`tasks_deleted_at_idx\` ON \`tasks\` (\`deleted_at\`);`)
  await db.run(sql`ALTER TABLE \`projects\` ADD COLUMN \`deleted_at\` text;`)
  await db.run(sql`CREATE INDEX \`projects_deleted_at_idx\` ON \`projects\` (\`deleted_at\`);`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.run(sql`DROP INDEX \`projects_deleted_at_idx\`;`)
  await db.run(sql`ALTER TABLE \`projects\` DROP COLUMN \`deleted_at\`;`)
  await db.run(sql`DROP INDEX \`tasks_deleted_at_idx\`;`)
  await db.run(sql`ALTER TABLE \`tasks\` DROP COLUMN \`deleted_at\`;`)
}
