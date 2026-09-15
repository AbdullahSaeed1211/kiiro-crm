import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-d1-sqlite'

/** Creates the cross-record FTS index used by the workspace command palette. */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.run(sql`CREATE VIRTUAL TABLE \`workspace_search\` USING fts5(
    \`record_type\` UNINDEXED,
    \`record_id\` UNINDEXED,
    \`title\`,
    \`subtitle\`,
    tokenize = 'unicode61 remove_diacritics 2'
  );`)

  await db.run(sql`INSERT INTO \`workspace_search\` (\`record_type\`, \`record_id\`, \`title\`, \`subtitle\`)
    SELECT 'organization', id, coalesce(name, ''), trim(coalesce(website, '') || ' ' || coalesce(phone, '') || ' ' || coalesce(email, ''))
    FROM \`organizations\`;`)
  await db.run(sql`INSERT INTO \`workspace_search\` (\`record_type\`, \`record_id\`, \`title\`, \`subtitle\`)
    SELECT 'contact', id, coalesce(first_name, ''), trim(coalesce(last_name, '') || ' ' || coalesce(email, '') || ' ' || coalesce(phone, ''))
    FROM \`contacts\`;`)
  await db.run(sql`INSERT INTO \`workspace_search\` (\`record_type\`, \`record_id\`, \`title\`, \`subtitle\`)
    SELECT 'lead', id, coalesce(title, ''), trim(coalesce(first_name, '') || ' ' || coalesce(last_name, '') || ' ' || coalesce(email, '') || ' ' || coalesce(phone, '') || ' ' || coalesce(company_name, '') || ' ' || coalesce(lost_note, ''))
    FROM \`leads\`;`)
  await db.run(sql`INSERT INTO \`workspace_search\` (\`record_type\`, \`record_id\`, \`title\`, \`subtitle\`)
    SELECT 'deal', id, coalesce(title, ''), coalesce(lost_note, '')
    FROM \`deals\`;`)
  await db.run(sql`INSERT INTO \`workspace_search\` (\`record_type\`, \`record_id\`, \`title\`, \`subtitle\`)
    SELECT 'project', id, coalesce(name, ''), coalesce(description, '')
    FROM \`projects\`;`)
  await db.run(sql`INSERT INTO \`workspace_search\` (\`record_type\`, \`record_id\`, \`title\`, \`subtitle\`)
    SELECT 'task', id, coalesce(title, ''), coalesce(description, '')
    FROM \`tasks\`;`)

  await db.run(sql`CREATE TRIGGER \`workspace_search_organizations_ai\` AFTER INSERT ON \`organizations\` BEGIN
    INSERT INTO \`workspace_search\` (\`record_type\`, \`record_id\`, \`title\`, \`subtitle\`)
    VALUES ('organization', new.id, coalesce(new.name, ''), trim(coalesce(new.website, '') || ' ' || coalesce(new.phone, '') || ' ' || coalesce(new.email, '')));
  END;`)
  await db.run(sql`CREATE TRIGGER \`workspace_search_organizations_au\` AFTER UPDATE ON \`organizations\` BEGIN
    DELETE FROM \`workspace_search\` WHERE record_type = 'organization' AND record_id = old.id;
    INSERT INTO \`workspace_search\` (\`record_type\`, \`record_id\`, \`title\`, \`subtitle\`)
    VALUES ('organization', new.id, coalesce(new.name, ''), trim(coalesce(new.website, '') || ' ' || coalesce(new.phone, '') || ' ' || coalesce(new.email, '')));
  END;`)
  await db.run(sql`CREATE TRIGGER \`workspace_search_organizations_ad\` AFTER DELETE ON \`organizations\` BEGIN
    DELETE FROM \`workspace_search\` WHERE record_type = 'organization' AND record_id = old.id;
  END;`)

  await db.run(sql`CREATE TRIGGER \`workspace_search_contacts_ai\` AFTER INSERT ON \`contacts\` BEGIN
    INSERT INTO \`workspace_search\` (\`record_type\`, \`record_id\`, \`title\`, \`subtitle\`)
    VALUES ('contact', new.id, coalesce(new.first_name, ''), trim(coalesce(new.last_name, '') || ' ' || coalesce(new.email, '') || ' ' || coalesce(new.phone, '')));
  END;`)
  await db.run(sql`CREATE TRIGGER \`workspace_search_contacts_au\` AFTER UPDATE ON \`contacts\` BEGIN
    DELETE FROM \`workspace_search\` WHERE record_type = 'contact' AND record_id = old.id;
    INSERT INTO \`workspace_search\` (\`record_type\`, \`record_id\`, \`title\`, \`subtitle\`)
    VALUES ('contact', new.id, coalesce(new.first_name, ''), trim(coalesce(new.last_name, '') || ' ' || coalesce(new.email, '') || ' ' || coalesce(new.phone, '')));
  END;`)
  await db.run(sql`CREATE TRIGGER \`workspace_search_contacts_ad\` AFTER DELETE ON \`contacts\` BEGIN
    DELETE FROM \`workspace_search\` WHERE record_type = 'contact' AND record_id = old.id;
  END;`)

  await db.run(sql`CREATE TRIGGER \`workspace_search_leads_ai\` AFTER INSERT ON \`leads\` BEGIN
    INSERT INTO \`workspace_search\` (\`record_type\`, \`record_id\`, \`title\`, \`subtitle\`)
    VALUES ('lead', new.id, coalesce(new.title, ''), trim(coalesce(new.first_name, '') || ' ' || coalesce(new.last_name, '') || ' ' || coalesce(new.email, '') || ' ' || coalesce(new.phone, '') || ' ' || coalesce(new.company_name, '') || ' ' || coalesce(new.lost_note, '')));
  END;`)
  await db.run(sql`CREATE TRIGGER \`workspace_search_leads_au\` AFTER UPDATE ON \`leads\` BEGIN
    DELETE FROM \`workspace_search\` WHERE record_type = 'lead' AND record_id = old.id;
    INSERT INTO \`workspace_search\` (\`record_type\`, \`record_id\`, \`title\`, \`subtitle\`)
    VALUES ('lead', new.id, coalesce(new.title, ''), trim(coalesce(new.first_name, '') || ' ' || coalesce(new.last_name, '') || ' ' || coalesce(new.email, '') || ' ' || coalesce(new.phone, '') || ' ' || coalesce(new.company_name, '') || ' ' || coalesce(new.lost_note, '')));
  END;`)
  await db.run(sql`CREATE TRIGGER \`workspace_search_leads_ad\` AFTER DELETE ON \`leads\` BEGIN
    DELETE FROM \`workspace_search\` WHERE record_type = 'lead' AND record_id = old.id;
  END;`)

  await db.run(sql`CREATE TRIGGER \`workspace_search_deals_ai\` AFTER INSERT ON \`deals\` BEGIN
    INSERT INTO \`workspace_search\` (\`record_type\`, \`record_id\`, \`title\`, \`subtitle\`)
    VALUES ('deal', new.id, coalesce(new.title, ''), coalesce(new.lost_note, ''));
  END;`)
  await db.run(sql`CREATE TRIGGER \`workspace_search_deals_au\` AFTER UPDATE ON \`deals\` BEGIN
    DELETE FROM \`workspace_search\` WHERE record_type = 'deal' AND record_id = old.id;
    INSERT INTO \`workspace_search\` (\`record_type\`, \`record_id\`, \`title\`, \`subtitle\`)
    VALUES ('deal', new.id, coalesce(new.title, ''), coalesce(new.lost_note, ''));
  END;`)
  await db.run(sql`CREATE TRIGGER \`workspace_search_deals_ad\` AFTER DELETE ON \`deals\` BEGIN
    DELETE FROM \`workspace_search\` WHERE record_type = 'deal' AND record_id = old.id;
  END;`)

  await db.run(sql`CREATE TRIGGER \`workspace_search_projects_ai\` AFTER INSERT ON \`projects\` BEGIN
    INSERT INTO \`workspace_search\` (\`record_type\`, \`record_id\`, \`title\`, \`subtitle\`)
    VALUES ('project', new.id, coalesce(new.name, ''), coalesce(new.description, ''));
  END;`)
  await db.run(sql`CREATE TRIGGER \`workspace_search_projects_au\` AFTER UPDATE ON \`projects\` BEGIN
    DELETE FROM \`workspace_search\` WHERE record_type = 'project' AND record_id = old.id;
    INSERT INTO \`workspace_search\` (\`record_type\`, \`record_id\`, \`title\`, \`subtitle\`)
    VALUES ('project', new.id, coalesce(new.name, ''), coalesce(new.description, ''));
  END;`)
  await db.run(sql`CREATE TRIGGER \`workspace_search_projects_ad\` AFTER DELETE ON \`projects\` BEGIN
    DELETE FROM \`workspace_search\` WHERE record_type = 'project' AND record_id = old.id;
  END;`)

  await db.run(sql`CREATE TRIGGER \`workspace_search_tasks_ai\` AFTER INSERT ON \`tasks\` BEGIN
    INSERT INTO \`workspace_search\` (\`record_type\`, \`record_id\`, \`title\`, \`subtitle\`)
    VALUES ('task', new.id, coalesce(new.title, ''), coalesce(new.description, ''));
  END;`)
  await db.run(sql`CREATE TRIGGER \`workspace_search_tasks_au\` AFTER UPDATE ON \`tasks\` BEGIN
    DELETE FROM \`workspace_search\` WHERE record_type = 'task' AND record_id = old.id;
    INSERT INTO \`workspace_search\` (\`record_type\`, \`record_id\`, \`title\`, \`subtitle\`)
    VALUES ('task', new.id, coalesce(new.title, ''), coalesce(new.description, ''));
  END;`)
  await db.run(sql`CREATE TRIGGER \`workspace_search_tasks_ad\` AFTER DELETE ON \`tasks\` BEGIN
    DELETE FROM \`workspace_search\` WHERE record_type = 'task' AND record_id = old.id;
  END;`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  for (const trigger of [
    'workspace_search_organizations_ai',
    'workspace_search_organizations_au',
    'workspace_search_organizations_ad',
    'workspace_search_contacts_ai',
    'workspace_search_contacts_au',
    'workspace_search_contacts_ad',
    'workspace_search_leads_ai',
    'workspace_search_leads_au',
    'workspace_search_leads_ad',
    'workspace_search_deals_ai',
    'workspace_search_deals_au',
    'workspace_search_deals_ad',
    'workspace_search_projects_ai',
    'workspace_search_projects_au',
    'workspace_search_projects_ad',
    'workspace_search_tasks_ai',
    'workspace_search_tasks_au',
    'workspace_search_tasks_ad',
  ]) {
    await db.run(sql.raw(`DROP TRIGGER IF EXISTS \`${trigger}\`;`))
  }
  await db.run(sql`DROP TABLE IF EXISTS \`workspace_search\`;`)
}
