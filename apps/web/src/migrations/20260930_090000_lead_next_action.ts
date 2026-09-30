import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-d1-sqlite'

/** Adds the day a lead's next follow-up is due; existing leads have none scheduled. */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.run(sql`ALTER TABLE \`leads\` ADD COLUMN \`next_action_at\` numeric;`)
  await db.run(sql`CREATE INDEX \`leads_next_action_at_idx\` ON \`leads\` (\`next_action_at\`);`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.run(sql`DROP INDEX \`leads_next_action_at_idx\`;`)
  await db.run(sql`ALTER TABLE \`leads\` DROP COLUMN \`next_action_at\`;`)
}
