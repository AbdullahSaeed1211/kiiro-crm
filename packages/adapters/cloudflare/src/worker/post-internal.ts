import { INTERNAL_SECRET_HEADER, type InternalForwardEnv } from '../contracts/worker'

/** Body and headers of a forwarded internal request. */
export interface InternalPost {
  readonly body: BodyInit
  readonly contentType: string
  readonly headers?: Readonly<Record<string, string>>
}

/** POSTs to one of the tenant's internal routes through its self-referencing service binding. */
export function postInternal(env: InternalForwardEnv, path: string, post: InternalPost): Promise<Response> {
  const headers = { ...post.headers, 'content-type': post.contentType, [INTERNAL_SECRET_HEADER]: env.INTERNAL_SECRET }
  const request = new Request(new URL(path, env.APP_ORIGIN), { method: 'POST', body: post.body, headers })
  return env.WORKER_SELF_REFERENCE.fetch(request)
}
