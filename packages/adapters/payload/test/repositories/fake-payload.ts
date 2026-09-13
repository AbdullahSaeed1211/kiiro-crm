import type { Payload, PayloadRequest } from 'payload'

type Args = Readonly<Record<string, unknown>>

type Method = 'find' | 'count' | 'create' | 'access' | 'write'

/** One recorded Local API call, update access check (`access`) or conditional database update (`write`). */
export interface Call {
  readonly method: Method
  readonly args: Args
}

/** Scripted responses per method; `write` answers with the returned rows, and a handler may throw to simulate an error. */
export type Handlers = Partial<Record<Method, (args: Args) => unknown>>

const DEFAULTS: Readonly<Record<Method, unknown>> = {
  find: { docs: [] },
  count: { totalDocs: 1 },
  create: { id: 'created' },
  access: true,
  write: [],
}

type Recorder = (name: Method) => (args: Args) => Promise<unknown>

interface FakeColumn {
  readonly key: string
}

const COLUMN_KEYS = ['id', 'updatedAt', 'stageId', 'stageEnteredAt', 'startAt', 'dueAt']
const TABLE = Object.fromEntries(COLUMN_KEYS.map((key): [string, FakeColumn] => [key, { key }]))

function fakeDrizzle(write: (args: Args) => Promise<unknown>) {
  const statement = (table: unknown, values: Args) => ({
    where: (where: unknown) => ({ returning: () => write({ table, values, where }) }),
  })
  return { update: (table: unknown) => ({ set: (values: Args) => statement(table, values) }) }
}

// The Drizzle members `writeIfUnchanged` uses; conditions become plain objects so tests can compare them.
function fakeDb(record: Recorder) {
  return {
    tables: { tasks: TABLE, projects: TABLE },
    tableNameMap: new Map([['tasks', 'tasks']]),
    operators: {
      and: (...conditions: unknown[]) => ({ and: conditions }),
      equals: (column: FakeColumn, value: unknown) => ({ [column.key]: value }),
    },
    drizzle: fakeDrizzle(record('write')),
  }
}

/** A fake `payload` that records every call and answers from `handlers`. */
export function fakePayload(handlers: Handlers = {}): { payload: Payload; calls: Call[] } {
  const calls: Call[] = []
  const method: Recorder = (name) => (args) => {
    calls.push({ method: name, args })
    return Promise.resolve().then(() => handlers[name]?.(args) ?? DEFAULTS[name])
  }
  const collection = { config: { access: { update: method('access') } } }
  const payload = {
    find: method('find'),
    count: method('count'),
    create: method('create'),
    collections: { tasks: collection, projects: collection },
    db: fakeDb(method),
  }
  return { payload: payload as unknown as Payload, calls }
}

/** A fake request carrying `user` and a recording `payload`. */
export function fakeRequest(user: object | null, handlers: Handlers = {}) {
  const { payload, calls } = fakePayload(handlers)
  const req = { user, payload } as unknown as PayloadRequest
  return { req, calls }
}
