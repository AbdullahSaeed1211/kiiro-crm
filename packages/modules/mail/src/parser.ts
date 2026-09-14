import type { ParsedEmail } from './contracts'
function headersOf(text: string): ReadonlyMap<string, string> {
  const separator = /\r?\n\r?\n/.exec(text)
  const section = separator === null ? text : text.slice(0, separator.index)
  const result = new Map<string, string>()
  for (const line of section.replace(/\r?\n(?=[ \t])/g, '').split(/\r?\n/)) {
    const colon = line.indexOf(':')
    const name = colon > 0 ? line.slice(0, colon).trim().toLowerCase() : ''
    if (name !== '' && !result.has(name)) result.set(name, line.slice(colon + 1).trim())
  }
  return result
}
function addresses(value: string | undefined): string[] {
  return value === undefined
    ? []
    : value
        .split(',')
        .map((entry) => entry.trim())
        .filter(Boolean)
}
/** Parses the bounded header and text-body subset used by inbound routing. */
export function parseEmail(raw: ArrayBuffer): ParsedEmail {
  const source = new TextDecoder().decode(raw)
  const separator = /\r?\n\r?\n/.exec(source)
  const body = separator === null ? '' : source.slice(separator.index + separator[0].length)
  const headers = headersOf(source)
  const messageId =
    headers.get('message-id') ??
    `sha256:${Array.from(new Uint8Array(raw))
      .slice(0, 32)
      .map((byte) => byte.toString(16).padStart(2, '0'))
      .join('')}`
  const inReplyTo = headers.get('in-reply-to')
  return {
    messageId,
    ...(inReplyTo === undefined ? {} : { inReplyTo }),
    from: headers.get('from') ?? '',
    to: addresses(headers.get('to')),
    cc: addresses(headers.get('cc')),
    subject: headers.get('subject') ?? '',
    textBody: body.slice(0, 200_000),
  }
}
