function concat(chunks: readonly Uint8Array[], total: number): ArrayBuffer {
  const bytes = new Uint8Array(total)
  let offset = 0
  for (const chunk of chunks) {
    bytes.set(chunk, offset)
    offset += chunk.byteLength
  }
  return bytes.buffer
}

/**
 * Reads a request body into memory, stopping as soon as it exceeds `maxBytes`,
 * so a body without an honest `content-length` is never buffered past the limit.
 * @returns the body bytes, or `undefined` when the body is larger than `maxBytes`.
 */
export async function readBodyWithin(request: Request, maxBytes: number): Promise<ArrayBuffer | undefined> {
  if (request.body === null) return new ArrayBuffer(0)
  const reader = request.body.getReader()
  const chunks: Uint8Array[] = []
  let total = 0
  for (let next = await reader.read(); !next.done; next = await reader.read()) {
    total += next.value.byteLength
    if (total > maxBytes) {
      await reader.cancel()
      return undefined
    }
    chunks.push(next.value)
  }
  return concat(chunks, total)
}
