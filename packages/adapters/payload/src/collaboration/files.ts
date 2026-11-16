/** Product attachment limit from spec §10.4. */
export const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024

/** MIME types accepted by the product file route. */
export const ALLOWED_ATTACHMENT_MIMES = new Set([
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
  'text/plain',
  'text/csv',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/zip',
  'application/x-zip-compressed',
  'audio/mpeg',
  'audio/mp3',
  'audio/mp4',
  'audio/x-m4a',
  'audio/wav',
  'audio/x-wav',
  'audio/wave',
  'audio/vnd.wave',
  'audio/ogg',
  'application/ogg',
  'audio/webm',
])

const AUDIO_MIME_EXTENSIONS: Readonly<Record<string, readonly string[]>> = {
  'audio/mpeg': ['.mp3'],
  'audio/mp3': ['.mp3'],
  'audio/mp4': ['.m4a'],
  'audio/x-m4a': ['.m4a'],
  'audio/wav': ['.wav'],
  'audio/x-wav': ['.wav'],
  'audio/wave': ['.wav'],
  'audio/vnd.wave': ['.wav'],
  'audio/ogg': ['.ogg'],
  'application/ogg': ['.ogg'],
  'audio/webm': ['.webm'],
}

function safeCharacters(value: string): string {
  let safe = ''
  let previousSeparator = false
  for (const character of value) {
    if (/[a-zA-Z0-9._-]/u.test(character)) {
      safe += character
      previousSeparator = character === '-'
    } else if (!previousSeparator) {
      safe += '-'
      previousSeparator = true
    }
  }
  return safe
}

function trimFileName(value: string): string {
  let start = 0
  let end = value.length
  while (start < end && (value[start] === '-' || value[start] === '.')) start += 1
  while (end > start && (value[end - 1] === '-' || value[end - 1] === '.')) end -= 1
  return value.slice(start, end) || 'file'
}

/** Sanitizes a user-visible name for an object key while retaining its extension where possible. */
export function sanitizeFileName(name: string): string {
  const normalized = name.normalize('NFKD').replaceAll(/[\u0300-\u036f]/g, '')
  return trimFileName(safeCharacters(normalized)).slice(0, 120)
}

export interface AttachmentKeyInput {
  readonly recordType: string
  readonly recordId: string
  readonly attachmentId: string
  readonly fileName: string
}

export function attachmentKey(input: AttachmentKeyInput): string {
  return `attachments/${sanitizeFileName(input.recordType)}/${sanitizeFileName(input.recordId)}/${sanitizeFileName(input.attachmentId)}/${sanitizeFileName(input.fileName)}`
}

export function validateAttachment(file: { readonly type: string; readonly size: number }): string | undefined {
  if (file.size > MAX_ATTACHMENT_BYTES) return 'File must be 10 MB or smaller.'
  if (!ALLOWED_ATTACHMENT_MIMES.has(file.type)) return 'This file type is not supported.'
  return undefined
}

/** Checks that an audio upload's declared type, extension and container signature agree. */
export function validAudioFileHeader(file: {
  readonly name: string
  readonly type: string
  readonly header: Uint8Array
}): boolean {
  const extension = `.${file.name.split('.').at(-1)?.toLowerCase() ?? ''}`
  if (!(AUDIO_MIME_EXTENSIONS[file.type]?.includes(extension) ?? false)) return false
  const bytes = file.header
  const validators: Readonly<Record<string, (header: Uint8Array) => boolean>> = {
    '.mp3': mp3Header,
    '.m4a': m4aHeader,
    '.wav': wavHeader,
    '.ogg': (header) => hasText(header, 0, 'OggS'),
    '.webm': webmHeader,
  }
  return validators[extension]?.(bytes) ?? false
}

function hasText(bytes: Uint8Array, offset: number, text: string): boolean {
  for (let index = 0; index < text.length; index += 1) {
    if (bytes[offset + index] !== text.charCodeAt(index)) return false
  }
  return true
}

function mp3Header(bytes: Uint8Array): boolean {
  const first = bytes[0] ?? 0
  const second = bytes[1] ?? 0
  return hasText(bytes, 0, 'ID3') || (first === 0xff && (second & 0xe0) === 0xe0)
}

function m4aHeader(bytes: Uint8Array): boolean {
  const brand = String.fromCharCode(...bytes.slice(8, 12))
  return hasText(bytes, 4, 'ftyp') && ['M4A ', 'isom', 'iso2', 'mp41', 'mp42'].includes(brand)
}

function wavHeader(bytes: Uint8Array): boolean {
  return hasText(bytes, 0, 'RIFF') && hasText(bytes, 8, 'WAVE')
}

function webmHeader(bytes: Uint8Array): boolean {
  return bytes[0] === 0x1a && bytes[1] === 0x45 && bytes[2] === 0xdf && bytes[3] === 0xa3
}
