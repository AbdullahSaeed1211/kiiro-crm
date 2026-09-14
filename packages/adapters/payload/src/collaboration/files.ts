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
])

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
