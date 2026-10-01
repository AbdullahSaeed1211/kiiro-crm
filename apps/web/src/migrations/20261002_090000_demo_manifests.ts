import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-d1-sqlite'

/** Adds the record of which documents the demo data created, so it can be removed with one call. */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.run(sql`CREATE TABLE \`demo_manifests\` (
  	\`id\` text(36) PRIMARY KEY NOT NULL,
  	\`part\` numeric NOT NULL,
  	\`entries\` text,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
  );
  `)
  await db.run(sql`CREATE INDEX \`demo_manifests_part_idx\` ON \`demo_manifests\` (\`part\`);`)
  await db.run(sql`CREATE INDEX \`demo_manifests_updated_at_idx\` ON \`demo_manifests\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`demo_manifests_created_at_idx\` ON \`demo_manifests\` (\`created_at\`);`)
  await db.run(sql`ALTER TABLE \`payload_locked_documents_rels\` ADD \`demo_manifests_id\` text(36) REFERENCES demo_manifests(id);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_demo_manifests_id_idx\` ON \`payload_locked_documents_rels\` (\`demo_manifests_id\`);`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.run(sql`DROP INDEX \`payload_locked_documents_rels_demo_manifests_id_idx\`;`)
  await db.run(sql`ALTER TABLE \`payload_locked_documents_rels\` DROP COLUMN \`demo_manifests_id\`;`)
  await db.run(sql`DROP TABLE \`demo_manifests\`;`)
}
