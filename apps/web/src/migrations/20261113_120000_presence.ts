import { sql, type MigrateDownArgs, type MigrateUpArgs } from '@payloadcms/db-d1-sqlite'

/** Last app activity signal per user; stale rows are hidden by the dashboard time window. */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.run(sql`CREATE TABLE presence (
    id text(36) PRIMARY KEY NOT NULL,
    user_id text(36) NOT NULL REFERENCES users(id) ON UPDATE no action ON DELETE cascade,
    last_seen_at numeric NOT NULL,
    updated_at text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
    created_at text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
  )`)
  await db.run(sql`CREATE UNIQUE INDEX presence_user_idx ON presence(user_id)`)
  await db.run(sql`CREATE INDEX presence_last_seen_at_idx ON presence(last_seen_at)`)
  await db.run(sql`CREATE INDEX presence_created_at_idx ON presence(created_at)`)
  await db.run(sql`ALTER TABLE payload_locked_documents_rels ADD presence_id text(36) REFERENCES presence(id)`)
  await db.run(sql`CREATE INDEX payload_locked_documents_rels_presence_id_idx ON payload_locked_documents_rels(presence_id)`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.run(sql`DROP INDEX payload_locked_documents_rels_presence_id_idx`)
  await db.run(sql`ALTER TABLE payload_locked_documents_rels DROP COLUMN presence_id`)
  await db.run(sql`DROP TABLE presence`)
}
