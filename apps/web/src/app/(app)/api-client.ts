/** What a call to the product API came back with: the data, or the reason in plain words. */
export type ApiResult<T> =
  | { readonly ok: true; readonly data: T }
  | {
      readonly ok: false
      readonly code: string
      readonly message: string
      readonly fields?: Readonly<Record<string, string>>
    }

/** The two shapes the product API sends; every field is optional because a response can be anything. */
interface Envelope {
  readonly ok?: unknown
  readonly data?: unknown
  readonly error?: { readonly code?: unknown; readonly message?: unknown; readonly fields?: unknown } | null
}

const textOf = (value: unknown, fallback: string): string =>
  typeof value === 'string' && value !== '' ? value : fallback

function fieldsOf(value: unknown): Record<string, string> | undefined {
  return typeof value === 'object' && value !== null ? (value as Record<string, string>) : undefined
}

function failureOf(body: Envelope | null, fallback: string): ApiResult<never> {
  const fields = fieldsOf(body?.error?.fields)
  return {
    ok: false,
    code: textOf(body?.error?.code, 'INTERNAL'),
    message: textOf(body?.error?.message, fallback),
    ...(fields === undefined ? {} : { fields }),
  }
}

/**
 * Reads a response from the product API, which always answers `{ ok: true, data }` or
 * `{ ok: false, error: { code, message, fields? } }`. Anything else, such as a dropped connection, becomes a failure
 * carrying `fallback`, so a caller has one shape to handle.
 */
export async function readApi<T = unknown>(response: Response, fallback: string): Promise<ApiResult<T>> {
  const body = (await response.json().catch(() => null)) as Envelope | null
  return body?.ok === true ? { ok: true, data: body.data as T } : failureOf(body, fallback)
}
