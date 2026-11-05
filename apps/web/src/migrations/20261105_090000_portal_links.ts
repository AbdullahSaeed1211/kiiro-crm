import { sql, type MigrateDownArgs, type MigrateUpArgs } from '@payloadcms/db-d1-sqlite'

/** Adds client portal links; only each token's SHA-256 is stored. */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.run(sql`CREATE TABLE portal_links (
    id text(36) PRIMARY KEY NOT NULL,
    organization_id text(36) NOT NULL REFERENCES organizations(id) ON UPDATE no action ON DELETE cascade,
    contact_id text(36) NOT NULL REFERENCES contacts(id) ON UPDATE no action ON DELETE cascade,
    email text NOT NULL,
    token_hash text NOT NULL,
    expires_at numeric NOT NULL,
    revoked_at numeric,
    last_opened_at numeric,
    created_by_id text(36) REFERENCES users(id) ON UPDATE no action ON DELETE set null,
    updated_at text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
    created_at text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
  )`)
  await db.run(sql`CREATE INDEX portal_links_organization_idx ON portal_links(organization_id)`)
  await db.run(sql`CREATE INDEX portal_links_contact_idx ON portal_links(contact_id)`)
  await db.run(sql`CREATE UNIQUE INDEX portal_links_token_hash_idx ON portal_links(token_hash)`)
  await db.run(sql`CREATE INDEX portal_links_created_by_idx ON portal_links(created_by_id)`)
  await db.run(sql`CREATE INDEX portal_links_updated_at_idx ON portal_links(updated_at)`)
  await db.run(sql`CREATE INDEX portal_links_created_at_idx ON portal_links(created_at)`)
  await db.run(sql`ALTER TABLE payload_locked_documents_rels ADD portal_links_id text(36) REFERENCES portal_links(id)`)
  await db.run(
    sql`CREATE INDEX payload_locked_documents_rels_portal_links_id_idx ON payload_locked_documents_rels(portal_links_id)`,
  )
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.run(sql`DROP INDEX payload_locked_documents_rels_portal_links_id_idx`)
  await db.run(sql`ALTER TABLE payload_locked_documents_rels DROP COLUMN portal_links_id`)
  await db.run(sql`DROP TABLE portal_links`)
}
