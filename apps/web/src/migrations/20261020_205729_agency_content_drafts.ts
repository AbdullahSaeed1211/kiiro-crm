import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-d1-sqlite'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.run(sql`PRAGMA foreign_keys=OFF;`)
  await db.run(sql`CREATE TABLE \`__new_content_items\` (
    \`id\` text(36) PRIMARY KEY NOT NULL,
    \`project_id\` text(36) NOT NULL,
    \`title\` text NOT NULL,
    \`body\` text,
    \`channel\` text,
    \`publish_at\` numeric,
    \`status\` text DEFAULT 'draft' NOT NULL,
    \`owner_id\` text(36) NOT NULL,
    \`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
    \`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
    FOREIGN KEY (\`project_id\`) REFERENCES \`projects\`(\`id\`) ON UPDATE no action ON DELETE set null,
    FOREIGN KEY (\`owner_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `)
  await db.run(sql`INSERT INTO \`__new_content_items\`("id", "project_id", "title", "body", "channel", "publish_at", "status", "owner_id", "updated_at", "created_at") SELECT "id", "project_id", "title", "body", "channel", "publish_at", "status", "owner_id", "updated_at", "created_at" FROM \`content_items\`;`)
  await db.run(sql`DROP TABLE \`content_items\`;`)
  await db.run(sql`ALTER TABLE \`__new_content_items\` RENAME TO \`content_items\`;`)
  await db.run(sql`PRAGMA foreign_keys=ON;`)
  await db.run(sql`CREATE INDEX \`content_items_project_idx\` ON \`content_items\` (\`project_id\`);`)
  await db.run(sql`CREATE INDEX \`content_items_publish_at_idx\` ON \`content_items\` (\`publish_at\`);`)
  await db.run(sql`CREATE INDEX \`content_items_status_idx\` ON \`content_items\` (\`status\`);`)
  await db.run(sql`CREATE INDEX \`content_items_owner_idx\` ON \`content_items\` (\`owner_id\`);`)
  await db.run(sql`CREATE INDEX \`content_items_updated_at_idx\` ON \`content_items\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`content_items_created_at_idx\` ON \`content_items\` (\`created_at\`);`)
  await db.run(sql`CREATE INDEX \`publishAt_project_idx\` ON \`content_items\` (\`publish_at\`,\`project_id\`);`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.run(sql`PRAGMA foreign_keys=OFF;`)
  await db.run(sql`CREATE TABLE \`__new_content_items\` (
    \`id\` text(36) PRIMARY KEY NOT NULL,
    \`project_id\` text(36) NOT NULL,
    \`title\` text NOT NULL,
    \`body\` text,
    \`channel\` text NOT NULL,
    \`publish_at\` numeric NOT NULL,
    \`status\` text DEFAULT 'draft' NOT NULL,
    \`owner_id\` text(36) NOT NULL,
    \`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
    \`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
    FOREIGN KEY (\`project_id\`) REFERENCES \`projects\`(\`id\`) ON UPDATE no action ON DELETE set null,
    FOREIGN KEY (\`owner_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `)
  await db.run(sql`INSERT INTO \`__new_content_items\`("id", "project_id", "title", "body", "channel", "publish_at", "status", "owner_id", "updated_at", "created_at") SELECT "id", "project_id", "title", "body", "channel", "publish_at", "status", "owner_id", "updated_at", "created_at" FROM \`content_items\`;`)
  await db.run(sql`DROP TABLE \`content_items\`;`)
  await db.run(sql`ALTER TABLE \`__new_content_items\` RENAME TO \`content_items\`;`)
  await db.run(sql`PRAGMA foreign_keys=ON;`)
  await db.run(sql`CREATE INDEX \`content_items_project_idx\` ON \`content_items\` (\`project_id\`);`)
  await db.run(sql`CREATE INDEX \`content_items_publish_at_idx\` ON \`content_items\` (\`publish_at\`);`)
  await db.run(sql`CREATE INDEX \`content_items_status_idx\` ON \`content_items\` (\`status\`);`)
  await db.run(sql`CREATE INDEX \`content_items_owner_idx\` ON \`content_items\` (\`owner_id\`);`)
  await db.run(sql`CREATE INDEX \`content_items_updated_at_idx\` ON \`content_items\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`content_items_created_at_idx\` ON \`content_items\` (\`created_at\`);`)
  await db.run(sql`CREATE INDEX \`publishAt_project_idx\` ON \`content_items\` (\`publish_at\`,\`project_id\`);`)
}
