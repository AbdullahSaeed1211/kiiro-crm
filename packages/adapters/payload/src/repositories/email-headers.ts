const HEADER_END = /\r?\n\r?\n/
const FOLD = /\r?\n(?=[ \t])/g
const LINE_BREAK = /\r?\n/

/** Reads a raw message's header section into lower-cased names mapped to their first unfolded, trimmed value. */
export function parseHeaders(message: string): ReadonlyMap<string, string> {
  const end = message.search(HEADER_END)
  const section = end === -1 ? message : message.slice(0, end)
  const headers = new Map<string, string>()
  for (const line of section.replace(FOLD, '').split(LINE_BREAK)) {
    const colon = line.indexOf(':')
    const name = colon > 0 ? line.slice(0, colon).trim().toLowerCase() : ''
    if (name !== '' && !headers.has(name)) headers.set(name, line.slice(colon + 1).trim())
  }
  return headers
}
