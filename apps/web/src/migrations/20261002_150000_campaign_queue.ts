import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-d1-sqlite'

/** Adds the queue that lets a newsletter to a long list go out in rounds. */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.run(sql`CREATE TABLE \`campaign_queue\` (
  	\`id\` text(36) PRIMARY KEY NOT NULL,
  	\`campaign_id\` text NOT NULL,
  	\`subject\` text NOT NULL,
  	\`body\` text NOT NULL,
  	\`origin\` text NOT NULL,
  	\`from_address\` text NOT NULL,
  	\`status\` text DEFAULT 'sending' NOT NULL,
  	\`total\` numeric NOT NULL,
  	\`sent\` numeric NOT NULL,
  	\`failed\` numeric NOT NULL,
  	\`pending\` text,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
  );
  `)
  await db.run(sql`CREATE INDEX \`campaign_queue_campaign_id_idx\` ON \`campaign_queue\` (\`campaign_id\`);`)
  await db.run(sql`CREATE INDEX \`campaign_queue_status_idx\` ON \`campaign_queue\` (\`status\`);`)
  await db.run(sql`CREATE INDEX \`campaign_queue_updated_at_idx\` ON \`campaign_queue\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`campaign_queue_created_at_idx\` ON \`campaign_queue\` (\`created_at\`);`)
  await db.run(sql`ALTER TABLE \`payload_locked_documents_rels\` ADD \`campaign_queue_id\` text(36) REFERENCES campaign_queue(id);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_campaign_queue_id_idx\` ON \`payload_locked_documents_rels\` (\`campaign_queue_id\`);`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.run(sql`DROP INDEX \`payload_locked_documents_rels_campaign_queue_id_idx\`;`)
  await db.run(sql`ALTER TABLE \`payload_locked_documents_rels\` DROP COLUMN \`campaign_queue_id\`;`)
  await db.run(sql`DROP TABLE \`campaign_queue\`;`)
}
