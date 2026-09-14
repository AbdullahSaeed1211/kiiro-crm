/* eslint-disable complexity, sonarjs/cognitive-complexity, max-statements, max-params, sonarjs/super-linear-regex -- MIME parsing requires bounded stateful decoding. */
import type { ParsedAttachment, ParsedEmail } from './contracts'

interface MimePart {
  readonly headers: ReadonlyMap<string, string>
  readonly body: string
}

function splitHeaderBody(source: string): MimePart {
  const separator = /\r?\n\r?\n/.exec(source)
  return {
    headers: headersOf(separator === null ? source : source.slice(0, separator.index)),
    body: separator === null ? '' : source.slice(separator.index + separator[0].length),
  }
}

function headersOf(section: string): ReadonlyMap<string, string> {
  const result = new Map<string, string>()
  for (const line of section.replace(/\r?\n(?=[ \t])/g, ' ').split(/\r?\n/)) {
    const colon = line.indexOf(':')
    const name = colon > 0 ? line.slice(0, colon).trim().toLowerCase() : ''
    if (name !== '' && !result.has(name)) result.set(name, decodeHeader(line.slice(colon + 1).trim()))
  }
  return result
}

function decodeHeader(value: string): string {
  return value.replace(
    /=\?([^?\s]+)\?([bBqQ])\?([^?]*)\?=/g,
    (_match, charset: string, encoding: string, content: string) => {
      const bytes = encoding.toLowerCase() === 'b' ? decodeBase64(content) : decodeQuotedPrintable(content, true)
      return decodeBytes(bytes, charset)
    },
  )
}

function decodeBase64(value: string): Uint8Array {
  const compact = value.replace(/\s/g, '')
  try {
    const binary = atob(compact)
    return Uint8Array.from(binary, (char) => char.charCodeAt(0))
  } catch {
    return new Uint8Array()
  }
}

function decodeQuotedPrintable(value: string, header = false): Uint8Array {
  const normalized = header ? value.replace(/_/g, ' ') : value.replace(/=\r?\n/g, '')
  const bytes: number[] = []
  for (let index = 0; index < normalized.length; index += 1) {
    const char = normalized[index]
    if (char === '=' && /^[0-9a-fA-F]{2}$/.test(normalized.slice(index + 1, index + 3))) {
      bytes.push(Number.parseInt(normalized.slice(index + 1, index + 3), 16))
      index += 2
    } else {
      bytes.push(normalized.charCodeAt(index) & 0xff)
    }
  }
  return Uint8Array.from(bytes)
}

function decodeBytes(bytes: Uint8Array, charset = 'utf-8'): string {
  const normalized = charset.toLowerCase().replace(/['"]/g, '')
  try {
    return new TextDecoder(normalized === 'iso-8859-1' ? 'iso-8859-1' : 'utf-8').decode(bytes)
  } catch {
    return new TextDecoder().decode(bytes)
  }
}

function transferDecoded(body: string, encoding: string | undefined): Uint8Array {
  if (encoding?.toLowerCase() === 'base64') return decodeBase64(body)
  if (encoding?.toLowerCase() === 'quoted-printable') return decodeQuotedPrintable(body)
  return new TextEncoder().encode(body)
}

function parameter(value: string | undefined, name: string): string | undefined {
  if (value === undefined) return undefined
  const match = new RegExp(`(?:^|;)\\s*${name}\\*?\\s*=\\s*(?:"([^"]*)"|([^;\\s]*))`, 'i').exec(value)
  const raw = match?.[1] ?? match?.[2]
  if (raw === undefined) return undefined
  try {
    const encoded = /^utf-8''(.+)$/i.exec(raw)
    return decodeHeader(encoded === null ? raw : decodeURIComponent(encoded[1] ?? raw))
  } catch {
    return decodeHeader(raw)
  }
}

function addressList(value: string | undefined): string[] {
  if (value === undefined) return []
  const entries: string[] = []
  let current = ''
  let quoted = false
  for (const char of value) {
    if (char === '"') quoted = !quoted
    if (char === ',' && !quoted) {
      if (current.trim() !== '') entries.push(current.trim())
      current = ''
    } else current += char
  }
  if (current.trim() !== '') entries.push(current.trim())
  return entries.map(mailbox).filter((address): address is string => address !== undefined)
}

function mailbox(value: string): string | undefined {
  const angle = /<([^<>]+)>/.exec(value)?.[1] ?? value.replace(/^.*?\s+/, '')
  const address = angle.trim().replace(/^<|>$/g, '').toLowerCase()
  return /^[^\s@<>]+@[^\s@<>]+$/.test(address) ? address : undefined
}

function multipartParts(part: MimePart, boundary: string): MimePart[] {
  return part.body
    .split(`--${boundary}`)
    .slice(1)
    .filter((chunk) => !chunk.trim().startsWith('--'))
    .map((chunk) => chunk.replace(/^\r?\n/, '').replace(/\r?\n$/, ''))
    .map(splitHeaderBody)
}

function collectMime(part: MimePart): {
  readonly text?: string
  readonly html?: string
  readonly attachments: ParsedAttachment[]
} {
  const type = part.headers.get('content-type') ?? 'text/plain'
  const boundary = parameter(type, 'boundary')
  if (type.toLowerCase().startsWith('multipart/') && boundary !== undefined) {
    let text: string | undefined
    let html: string | undefined
    const attachments: ParsedAttachment[] = []
    for (const child of multipartParts(part, boundary)) {
      const childType = child.headers.get('content-type') ?? 'text/plain'
      const disposition = child.headers.get('content-disposition') ?? ''
      const filename = parameter(disposition, 'filename') ?? parameter(childType, 'name')
      const childResult = collectMime(child)
      if (filename !== undefined || disposition.toLowerCase().startsWith('attachment')) {
        attachments.push({
          filename: filename ?? 'attachment',
          contentType: childType.split(';', 1)[0]?.trim().toLowerCase() ?? 'application/octet-stream',
          bytes: transferDecoded(child.body, child.headers.get('content-transfer-encoding')).slice().buffer,
        })
      } else {
        text ??= childResult.text
        html ??= childResult.html
        attachments.push(...childResult.attachments)
      }
    }
    return { ...(text === undefined ? {} : { text }), ...(html === undefined ? {} : { html }), attachments }
  }
  const bytes = transferDecoded(part.body, part.headers.get('content-transfer-encoding'))
  const charset = parameter(type, 'charset')
  const decoded = decodeBytes(bytes, charset)
  if (type.toLowerCase().startsWith('text/html')) return { html: decoded, attachments: [] }
  return { text: decoded, attachments: [] }
}

function htmlToText(value: string): string {
  return value
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .trim()
}

async function sha256Raw(raw: ArrayBuffer): Promise<string> {
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', raw))
  return Array.from(digest, (byte) => byte.toString(16).padStart(2, '0')).join('')
}

/** Parses RFC-style headers and common MIME text/attachment parts. Production callers may inject PostalMime at this boundary. */
export async function parseEmail(raw: ArrayBuffer): Promise<ParsedEmail> {
  const source = new TextDecoder().decode(raw)
  const root = splitHeaderBody(source)
  const mime = collectMime(root)
  const messageId = root.headers.get('message-id') ?? `sha256:${await sha256Raw(raw)}`
  const textBody = (mime.text ?? (mime.html === undefined ? root.body : htmlToText(mime.html))).slice(0, 200_000)
  const inReplyTo = root.headers.get('in-reply-to')
  return {
    messageId,
    ...(inReplyTo === undefined ? {} : { inReplyTo }),
    from: addressList(root.headers.get('from'))[0] ?? '',
    to: addressList(root.headers.get('to')),
    cc: addressList(root.headers.get('cc')),
    subject: root.headers.get('subject') ?? '',
    textBody,
    ...(mime.attachments.length === 0 ? {} : { attachments: mime.attachments }),
  }
}
