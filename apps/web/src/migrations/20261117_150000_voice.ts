import { sql, type MigrateDownArgs, type MigrateUpArgs } from '@payloadcms/db-d1-sqlite'

const timestamps = `updated_at text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
  created_at text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL`

const tables = {
  voice_settings: 'value text NOT NULL',
  voice_numbers: 'e164 text NOT NULL, status text NOT NULL, value text NOT NULL',
  voice_calls: `request_key text NOT NULL, direction text NOT NULL, state text NOT NULL,
    number_id text(36) NOT NULL REFERENCES voice_numbers(id), user_id text(36) REFERENCES users(id),
    provider_call_id text, voice_updated_at numeric NOT NULL, value text NOT NULL`,
  voice_call_legs: `leg_key text NOT NULL, call_id text(36) NOT NULL REFERENCES voice_calls(id) ON DELETE cascade,
    device_id text, kind text NOT NULL, state text NOT NULL, provider_call_id text,
    voice_updated_at numeric NOT NULL, value text NOT NULL`,
  voice_devices: `key text NOT NULL, user_id text(36) NOT NULL REFERENCES users(id),
    device_id text NOT NULL, expires_at numeric NOT NULL, value text NOT NULL`,
  voice_events: `event_key text NOT NULL, status text NOT NULL, lease_until numeric,
    received_at numeric NOT NULL, value text NOT NULL`,
  voice_operations: `key text NOT NULL, user_id text(36) NOT NULL REFERENCES users(id),
    kind text NOT NULL, status text NOT NULL, value text NOT NULL`,
}

const indexes = [
  'UNIQUE INDEX voice_numbers_e164_idx ON voice_numbers(e164)',
  'INDEX voice_numbers_status_idx ON voice_numbers(status)',
  'UNIQUE INDEX voice_calls_request_key_idx ON voice_calls(request_key)',
  'INDEX voice_calls_direction_idx ON voice_calls(direction)',
  'INDEX voice_calls_state_idx ON voice_calls(state)',
  'INDEX voice_calls_number_idx ON voice_calls(number_id)',
  'INDEX voice_calls_user_idx ON voice_calls(user_id)',
  'INDEX voice_calls_user_state_idx ON voice_calls(user_id,state)',
  'INDEX voice_calls_provider_call_id_idx ON voice_calls(provider_call_id)',
  'INDEX voice_calls_voice_updated_at_idx ON voice_calls(voice_updated_at)',
  'UNIQUE INDEX voice_call_legs_leg_key_idx ON voice_call_legs(leg_key)',
  'INDEX voice_call_legs_call_idx ON voice_call_legs(call_id)',
  'INDEX voice_call_legs_kind_idx ON voice_call_legs(kind)',
  'INDEX voice_call_legs_state_idx ON voice_call_legs(state)',
  'INDEX voice_call_legs_provider_call_id_idx ON voice_call_legs(provider_call_id)',
  'INDEX voice_call_legs_voice_updated_at_idx ON voice_call_legs(voice_updated_at)',
  'INDEX voice_call_legs_call_kind_idx ON voice_call_legs(call_id,kind)',
  'UNIQUE INDEX voice_devices_key_idx ON voice_devices(key)',
  'UNIQUE INDEX voice_devices_user_device_id_idx ON voice_devices(user_id,device_id)',
  'INDEX voice_devices_user_idx ON voice_devices(user_id)',
  'INDEX voice_devices_expires_at_idx ON voice_devices(expires_at)',
  'UNIQUE INDEX voice_events_event_key_idx ON voice_events(event_key)',
  'INDEX voice_events_status_idx ON voice_events(status)',
  'INDEX voice_events_lease_until_idx ON voice_events(lease_until)',
  'INDEX voice_events_received_at_idx ON voice_events(received_at)',
  'INDEX voice_events_status_lease_until_idx ON voice_events(status,lease_until)',
  'UNIQUE INDEX voice_operations_key_idx ON voice_operations(key)',
  'INDEX voice_operations_user_idx ON voice_operations(user_id)',
  'INDEX voice_operations_kind_idx ON voice_operations(kind)',
  'INDEX voice_operations_status_idx ON voice_operations(status)',
]

async function addRelations(db: MigrateUpArgs['db'], table: string): Promise<void> {
  await db.run(sql.raw(`CREATE TABLE ${table}_rels (
    id integer PRIMARY KEY NOT NULL, "order" integer, parent_id text(36) NOT NULL,
    path text NOT NULL, users_id text(36),
    FOREIGN KEY(parent_id) REFERENCES ${table}(id) ON DELETE cascade,
    FOREIGN KEY(users_id) REFERENCES users(id) ON DELETE cascade)`))
  for (const column of ['order', 'parent_id', 'path', 'users_id']) {
    await db.run(sql.raw(`CREATE INDEX ${table}_rels_${column}_idx ON ${table}_rels("${column}")`))
  }
}

/** Private calling state is additive; existing tasks, leads and uploaded files stay intact. */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  for (const [table, columns] of Object.entries(tables)) {
    await db.run(sql.raw(`CREATE TABLE ${table}(id text(36) PRIMARY KEY NOT NULL, ${columns}, ${timestamps})`))
    for (const column of ['updated_at', 'created_at']) {
      await db.run(sql.raw(`CREATE INDEX ${table}_${column}_idx ON ${table}(${column})`))
    }
    await db.run(sql.raw(`ALTER TABLE payload_locked_documents_rels ADD ${table}_id text(36) REFERENCES ${table}(id)`))
    await db.run(sql.raw(`CREATE INDEX payload_locked_documents_rels_${table}_id_idx ON payload_locked_documents_rels(${table}_id)`))
  }
  for (const statement of indexes) await db.run(sql.raw(`CREATE ${statement}`))
  await addRelations(db, 'voice_numbers')
  await addRelations(db, 'voice_calls')
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.run(sql`DROP TABLE voice_calls_rels`)
  await db.run(sql`DROP TABLE voice_numbers_rels`)
  for (const table of Object.keys(tables).reverse()) {
    await db.run(sql.raw(`DROP INDEX payload_locked_documents_rels_${table}_id_idx`))
    await db.run(sql.raw(`ALTER TABLE payload_locked_documents_rels DROP COLUMN ${table}_id`))
    await db.run(sql.raw(`DROP TABLE ${table}`))
  }
}
