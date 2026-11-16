import { sql, type MigrateDownArgs, type MigrateUpArgs } from '@payloadcms/db-d1-sqlite'

/** Splits task responsibility while keeping the old assignees relationship as the edit-scope compatibility field. */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.run(sql`ALTER TABLE tasks ADD COLUMN primary_assignee_id text(36)`)
  await db.run(sql`ALTER TABLE tasks ADD COLUMN collaborator_ids text`)
  await db.run(sql`ALTER TABLE tasks ADD COLUMN watcher_ids text`)
  await db.run(sql`ALTER TABLE tasks ADD COLUMN assigned_by_id text(36)`)
  await db.run(sql`ALTER TABLE tasks ADD COLUMN blocked_reason text`)
  await db.run(sql`ALTER TABLE tasks ADD COLUMN waiting_on_id text(36)`)

  // Imported responsibility metadata is authoritative when present. Otherwise preserve legacy order deterministically.
  await db.run(sql`UPDATE tasks SET primary_assignee_id = json_extract(custom_data, '$.primaryAssigneeId')
    WHERE json_valid(custom_data) AND json_type(custom_data, '$.primaryAssigneeId') = 'text'`)
  await db.run(sql`UPDATE tasks SET collaborator_ids = json_extract(custom_data, '$.collaboratorIds')
    WHERE json_valid(custom_data) AND json_type(custom_data, '$.collaboratorIds') = 'array'`)
  await db.run(sql`UPDATE tasks SET assigned_by_id = json_extract(custom_data, '$.assignedById')
    WHERE json_valid(custom_data) AND json_type(custom_data, '$.assignedById') = 'text'`)
  await db.run(sql`UPDATE tasks SET assigned_by_id = (
      SELECT audit.actor_id FROM audit_events audit
      WHERE audit.actor_id IS NOT NULL
        AND audit.actor_id IN (SELECT id FROM users)
        AND audit.verb IN ('task.created', 'task.assignees_changed')
        AND json_valid(audit.data)
        AND json_extract(audit.data, '$.taskId') = tasks.id
      ORDER BY audit.occurred_at DESC, audit.created_at DESC
      LIMIT 1
    ) WHERE EXISTS (
      SELECT 1 FROM audit_events audit
      WHERE audit.actor_id IS NOT NULL
        AND audit.actor_id IN (SELECT id FROM users)
        AND audit.verb IN ('task.created', 'task.assignees_changed')
        AND json_valid(audit.data)
        AND json_extract(audit.data, '$.taskId') = tasks.id
    )`)
  await db.run(sql`UPDATE tasks SET primary_assignee_id = (
      SELECT users_id FROM tasks_rels WHERE parent_id = tasks.id AND path = 'assignees' ORDER BY "order" LIMIT 1
    ) WHERE primary_assignee_id IS NULL`)
  await db.run(sql`UPDATE tasks SET collaborator_ids = COALESCE((
      SELECT json_group_array(users_id) FROM tasks_rels
      WHERE parent_id = tasks.id AND path = 'assignees' AND users_id != tasks.primary_assignee_id ORDER BY "order"
    ), '[]') WHERE collaborator_ids IS NULL`)
  await db.run(sql`UPDATE tasks SET watcher_ids = '[]' WHERE watcher_ids IS NULL`)
  // No actor is inferred for old tasks; assignment actor is populated only by future authenticated commands.
  await db.run(sql`CREATE INDEX tasks_primary_assignee_idx ON tasks(primary_assignee_id)`)
  await db.run(sql`CREATE INDEX tasks_assigned_by_idx ON tasks(assigned_by_id)`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.run(sql`DROP INDEX tasks_assigned_by_idx`)
  await db.run(sql`DROP INDEX tasks_primary_assignee_idx`)
  await db.run(sql`ALTER TABLE tasks DROP COLUMN waiting_on_id`)
  await db.run(sql`ALTER TABLE tasks DROP COLUMN blocked_reason`)
  await db.run(sql`ALTER TABLE tasks DROP COLUMN assigned_by_id`)
  await db.run(sql`ALTER TABLE tasks DROP COLUMN watcher_ids`)
  await db.run(sql`ALTER TABLE tasks DROP COLUMN collaborator_ids`)
  await db.run(sql`ALTER TABLE tasks DROP COLUMN primary_assignee_id`)
}
