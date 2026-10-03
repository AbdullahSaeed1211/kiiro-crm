import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-d1-sqlite'

/** Adds quotes and invoices. */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.run(sql`CREATE TABLE \`billing_documents\` (
  	\`id\` text(36) PRIMARY KEY NOT NULL,
  	\`kind\` text NOT NULL,
  	\`number\` text NOT NULL,
  	\`status\` text DEFAULT 'draft' NOT NULL,
  	\`organization_id\` text(36) NOT NULL,
  	\`deal_id\` text(36),
  	\`contact_id\` text(36),
  	\`currency\` text NOT NULL,
  	\`lines\` text NOT NULL,
  	\`note\` text,
  	\`due_at\` numeric,
  	\`payment_link\` text,
  	\`source_quote_id\` text,
  	\`sent_at\` numeric,
  	\`decided_at\` numeric,
  	\`paid_at\` numeric,
  	\`subtotal_minor\` numeric,
  	\`tax_minor\` numeric,
  	\`total_minor\` numeric,
  	\`created_by_id\` text(36),
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	FOREIGN KEY (\`organization_id\`) REFERENCES \`organizations\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`deal_id\`) REFERENCES \`deals\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`contact_id\`) REFERENCES \`contacts\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`created_by_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `)
  await db.run(sql`CREATE INDEX \`billing_documents_kind_idx\` ON \`billing_documents\` (\`kind\`);`)
  await db.run(sql`CREATE UNIQUE INDEX \`billing_documents_number_idx\` ON \`billing_documents\` (\`number\`);`)
  await db.run(sql`CREATE INDEX \`billing_documents_status_idx\` ON \`billing_documents\` (\`status\`);`)
  await db.run(sql`CREATE INDEX \`billing_documents_organization_idx\` ON \`billing_documents\` (\`organization_id\`);`)
  await db.run(sql`CREATE INDEX \`billing_documents_deal_idx\` ON \`billing_documents\` (\`deal_id\`);`)
  await db.run(sql`CREATE INDEX \`billing_documents_contact_idx\` ON \`billing_documents\` (\`contact_id\`);`)
  await db.run(sql`CREATE INDEX \`billing_documents_created_by_idx\` ON \`billing_documents\` (\`created_by_id\`);`)
  await db.run(sql`CREATE INDEX \`billing_documents_updated_at_idx\` ON \`billing_documents\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`billing_documents_created_at_idx\` ON \`billing_documents\` (\`created_at\`);`)
  await db.run(sql`ALTER TABLE \`payload_locked_documents_rels\` ADD \`billing_documents_id\` text(36) REFERENCES billing_documents(id);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_billing_documents_id_idx\` ON \`payload_locked_documents_rels\` (\`billing_documents_id\`);`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.run(sql`DROP INDEX \`payload_locked_documents_rels_billing_documents_id_idx\`;`)
  await db.run(sql`ALTER TABLE \`payload_locked_documents_rels\` DROP COLUMN \`billing_documents_id\`;`)
  await db.run(sql`DROP TABLE \`billing_documents\`;`)
}
