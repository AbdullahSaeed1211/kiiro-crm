/** Read the actual expiration claim from a provider JWT. */
export function jwtExpiry(token: string): number | undefined {
  const segment = token.split('.')[1]
  if (segment === undefined) return undefined
  try {
    const json = atob(segment.replaceAll('-', '+').replaceAll('_', '/') + '='.repeat((4 - (segment.length % 4)) % 4))
    const claims = JSON.parse(json) as { exp?: unknown }
    return typeof claims.exp === 'number' && Number.isSafeInteger(claims.exp) ? claims.exp * 1000 : undefined
  } catch {
    return undefined
  }
}

/** Decode a base64 value in the Workers runtime. */
export function decodeBase64(value: string): Uint8Array {
  const binary = atob(value)
  return Uint8Array.from(binary, (character) => character.charCodeAt(0))
}

/** Copy bytes into a detached ArrayBuffer accepted by WebCrypto. */
export function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const result = new ArrayBuffer(bytes.byteLength)
  new Uint8Array(result).set(bytes)
  return result
}

/** Read a response body with a strict byte limit. */
export async function boundedText(response: Response, maxBytes: number): Promise<string> {
  if (response.body === null) return ''
  const reader = response.body.getReader()
  const chunks = await readChunks(reader, maxBytes)
  return decodeChunks(chunks)
}

async function readChunks(reader: ReadableStreamDefaultReader<Uint8Array>, maxBytes: number): Promise<Uint8Array[]> {
  const chunks: Uint8Array[] = []
  let length = 0
  try {
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      length += value.byteLength
      if (length > maxBytes) {
        await reader.cancel()
        throw new Error('Telnyx response exceeded the size limit')
      }
      chunks.push(value)
    }
  } finally {
    reader.releaseLock()
  }
  return chunks
}

function decodeChunks(chunks: readonly Uint8Array[]): string {
  const length = chunks.reduce((total, chunk) => total + chunk.length, 0)
  const result = new Uint8Array(length)
  let offset = 0
  for (const chunk of chunks) {
    result.set(chunk, offset)
    offset += chunk.length
  }
  return new TextDecoder().decode(result)
}

/** Produce a stable provider command ID within Telnyx length bounds. */
export function deterministicCommandId(callId: string, action: string): string {
  return `${callId}-${action}`.slice(0, 64)
}

/** Validate and normalize a quoted monetary amount. */
export function costValue(value: unknown): string | undefined {
  if (typeof value !== 'string' && typeof value !== 'number') return undefined
  const text = String(value)
  return /^\d+(?:\.\d{1,4})?$/u.test(text) ? text : undefined
}

/** Check whether a parsed JSON value is a plain record. */
export function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}
