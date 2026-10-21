import { sql, type MigrateUpArgs, type MigrateDownArgs } from '@payloadcms/db-d1-sqlite'

/** Self-service attendance retains reported times separately from server receipt times. */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.run(sql`CREATE TABLE attendance (
    id text(36) PRIMARY KEY NOT NULL,
    user_id text(36) NOT NULL REFERENCES users(id),
    open_key text,
    reported_check_in_at numeric NOT NULL,
    submitted_at numeric NOT NULL,
    reported_check_out_at numeric,
    check_out_submitted_at numeric,
    note text,
    check_out_note text,
    updated_at text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
    created_at text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
    CHECK (reported_check_out_at IS NULL OR reported_check_out_at >= reported_check_in_at)
  )`)
  await db.run(sql`CREATE UNIQUE INDEX attendance_open_key_idx ON attendance(open_key)`)
  await db.run(sql`CREATE INDEX attendance_user_idx ON attendance(user_id)`)
  await db.run(sql`CREATE INDEX attendance_submitted_at_idx ON attendance(submitted_at)`)
  await db.run(sql`CREATE INDEX attendance_updated_at_idx ON attendance(updated_at)`)
  await db.run(sql`CREATE INDEX attendance_created_at_idx ON attendance(created_at)`)
  await db.run(sql`ALTER TABLE payload_locked_documents_rels ADD attendance_id text(36) REFERENCES attendance(id)`)
  await db.run(sql`CREATE INDEX payload_locked_documents_rels_attendance_id_idx ON payload_locked_documents_rels(attendance_id)`)
}
export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.run(sql`DROP INDEX payload_locked_documents_rels_attendance_id_idx`)
  await db.run(sql`ALTER TABLE payload_locked_documents_rels DROP COLUMN attendance_id`)
  await db.run(sql`DROP TABLE attendance`)
}
