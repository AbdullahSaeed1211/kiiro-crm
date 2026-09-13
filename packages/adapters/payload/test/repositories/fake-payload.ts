import type { Payload, PayloadRequest } from 'payload'

type Args = Readonly<Record<string, unknown>>

type Method = 'find' | 'update' | 'create'

/** One recorded Local API call. */
export interface Call {
  readonly method: Method
  readonly args: Args
}

/** Scripted responses per method; a handler may throw to simulate a Payload error. */
export type Handlers = Partial<Record<Method, (args: Args) => unknown>>

const DEFAULTS: Readonly<Record<Method, unknown>> = {
  find: { docs: [] },
  update: { docs: [], errors: [] },
  create: { id: 'created' },
}

/** A fake `payload` that records every call and answers from `handlers`. */
export function fakePayload(handlers: Handlers = {}): { payload: Payload; calls: Call[] } {
  const calls: Call[] = []
  const method = (name: Method) => (args: Args) => {
    calls.push({ method: name, args })
    return Promise.resolve().then(() => handlers[name]?.(args) ?? DEFAULTS[name])
  }
  const payload = { find: method('find'), update: method('update'), create: method('create') }
  return { payload: payload as unknown as Payload, calls }
}

/** A fake request carrying `user` and a recording `payload`. */
export function fakeRequest(user: object | null, handlers: Handlers = {}) {
  const { payload, calls } = fakePayload(handlers)
  const req = { user, payload } as unknown as PayloadRequest
  return { req, calls }
}
