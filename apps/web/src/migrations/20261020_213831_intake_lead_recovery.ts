import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-d1-sqlite'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.run(sql`ALTER TABLE \`leads\` ADD \`intake_submission_id\` text;`)
  await db.run(sql`CREATE UNIQUE INDEX \`leads_intake_submission_id_idx\` ON \`leads\` (\`intake_submission_id\`);`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.run(sql`DROP INDEX \`leads_intake_submission_id_idx\`;`)
  await db.run(sql`ALTER TABLE \`leads\` DROP COLUMN \`intake_submission_id\`;`)
}
