import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-d1-sqlite'

/** Adds the delivery log of outgoing webhooks. */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.run(sql`CREATE TABLE \`webhook_deliveries\` (
  	\`id\` text(36) PRIMARY KEY NOT NULL,
  	\`webhook\` text NOT NULL,
  	\`webhook_name\` text,
  	\`event\` text NOT NULL,
  	\`record_type\` text,
  	\`record_id\` text,
  	\`ok\` integer DEFAULT false,
  	\`status\` numeric,
  	\`attempts\` numeric,
  	\`error\` text,
  	\`at\` numeric NOT NULL,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
  );
  `)
  await db.run(sql`CREATE INDEX \`webhook_deliveries_webhook_idx\` ON \`webhook_deliveries\` (\`webhook\`);`)
  await db.run(sql`CREATE INDEX \`webhook_deliveries_at_idx\` ON \`webhook_deliveries\` (\`at\`);`)
  await db.run(sql`CREATE INDEX \`webhook_deliveries_updated_at_idx\` ON \`webhook_deliveries\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`webhook_deliveries_created_at_idx\` ON \`webhook_deliveries\` (\`created_at\`);`)
  await db.run(sql`ALTER TABLE \`payload_locked_documents_rels\` ADD \`webhook_deliveries_id\` text(36) REFERENCES webhook_deliveries(id);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_webhook_deliveries_id_idx\` ON \`payload_locked_documents_rels\` (\`webhook_deliveries_id\`);`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.run(sql`DROP INDEX \`payload_locked_documents_rels_webhook_deliveries_id_idx\`;`)
  await db.run(sql`ALTER TABLE \`payload_locked_documents_rels\` DROP COLUMN \`webhook_deliveries_id\`;`)
  await db.run(sql`DROP TABLE \`webhook_deliveries\`;`)
}
