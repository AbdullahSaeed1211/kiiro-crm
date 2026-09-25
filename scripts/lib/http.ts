/** Input for {@link requestWithTimeout}. */
export interface TimedRequest {
  readonly request?: typeof fetch
  readonly url: string
  readonly init?: RequestInit
  readonly timeoutMs: number
}

/** Fetches `url`, aborting and rejecting with a "timed out" error after `timeoutMs`. */
export async function requestWithTimeout({ request = fetch, url, init, timeoutMs }: TimedRequest): Promise<Response> {
  const controller = new AbortController()
  let timer: ReturnType<typeof setTimeout> | undefined
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      controller.abort()
      reject(new Error(`request to ${new URL(url).host} timed out after ${String(timeoutMs)}ms`))
    }, timeoutMs)
  })
  try {
    return await Promise.race([request(url, { ...init, signal: controller.signal }), timeout])
  } finally {
    if (timer !== undefined) clearTimeout(timer)
  }
}
