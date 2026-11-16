import { attachmentKey, sanitizeFileName } from '../../../../../../../packages/adapters/payload/src/collaboration/files'
import type { Payload } from 'payload'
import { requestForUser } from '../../../collaboration/auth'
import type { IntakeRecording } from './public-recording'

interface PersistRecordingInput {
  readonly payload: Payload
  readonly bucket: R2Bucket
  readonly recording: IntakeRecording
  readonly submissionId: string
  readonly leadId: string
  readonly uploader: Record<string, unknown>
}

function stringField(doc: unknown, key: string): string | undefined {
  if (typeof doc !== 'object' || doc === null) return undefined
  const value: unknown = Reflect.get(doc, key)
  return typeof value === 'string' ? value : undefined
}

function isSameAttachment(
  doc: unknown,
  input: { leadId: string; key: string; fileName: string; size: number; mime: string },
): boolean {
  if (typeof doc !== 'object' || doc === null) return false
  return (
    stringField(doc, 'recordType') === 'lead' &&
    stringField(doc, 'recordId') === input.leadId &&
    stringField(doc, 'fileKey') === input.key &&
    stringField(doc, 'fileName') === input.fileName &&
    Reflect.get(doc, 'sizeBytes') === input.size &&
    stringField(doc, 'mime') === input.mime
  )
}

async function findByFileKey(payload: Payload, key: string): Promise<Record<string, unknown> | undefined> {
  const result = await payload.find({
    collection: 'attachments',
    where: { fileKey: { equals: key } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })
  return result.docs[0] as unknown as Record<string, unknown> | undefined
}

async function contentHash(bytes: ArrayBuffer): Promise<string> {
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))
  return Array.from(digest, (byte) => byte.toString(16).padStart(2, '0')).join('')
}

async function ensureObject(input: { bucket: R2Bucket; key: string; bytes: ArrayBuffer; mime: string }): Promise<void> {
  const { bucket, key, bytes, mime } = input
  const existing = await bucket.get(key)
  if (existing !== null) {
    await requireMatchingBytes(existing, bytes)
    return
  }
  const stored = await bucket.put(key, bytes, {
    onlyIf: { etagDoesNotMatch: '*' },
    httpMetadata: { contentType: mime },
  })
  if (stored === null) {
    const winner = await bucket.get(key)
    if (winner === null) throw new Error('The call recording upload could not be verified.')
    await requireMatchingBytes(winner, bytes)
  }
}

async function requireMatchingBytes(existing: R2ObjectBody, bytes: ArrayBuffer): Promise<void> {
  if ((await contentHash(await existing.arrayBuffer())) !== (await contentHash(bytes)))
    throw new Error('A different call recording is already attached to this submission.')
}

async function createMetadata(input: PersistRecordingInput, key: string, fileName: string): Promise<void> {
  const { payload, recording, leadId, uploader } = input
  const uploaderId = stringField(uploader, 'id')
  if (uploaderId === undefined) throw new Error('The configured form owner could not be verified.')
  const req = requestForUser(payload, uploader)
  await payload.create({
    collection: 'attachments',
    data: {
      recordType: 'lead',
      recordId: leadId,
      fileKey: key,
      fileName,
      mime: recording.file.type,
      sizeBytes: recording.file.size,
      uploadedBy: uploaderId,
    },
    user: uploader,
    req,
    overrideAccess: true,
    depth: 0,
  })
}

/** Stores an audio attachment by the intake submission's unique key; retries cannot replace another file. */
export async function persistIntakeRecording(input: PersistRecordingInput): Promise<void> {
  const { recording, submissionId, leadId, payload, bucket } = input
  const fileName = sanitizeFileName(recording.file.name)
  const key = attachmentKey({
    recordType: 'lead',
    recordId: leadId,
    attachmentId: submissionId,
    fileName: 'call-recording',
  })
  const expected = { leadId, key, fileName, size: recording.file.size, mime: recording.file.type }
  const existing = await findByFileKey(payload, key)
  if (existing !== undefined && !isSameAttachment(existing, expected))
    throw new Error('A different call recording is already attached to this submission.')
  if (existing === undefined) {
    try {
      await createMetadata(input, key, fileName)
    } catch (error) {
      const duplicate = await findByFileKey(payload, key)
      if (duplicate === undefined || !isSameAttachment(duplicate, expected)) throw error
    }
  }
  await ensureObject({ bucket, key, bytes: await recording.file.arrayBuffer(), mime: recording.file.type })
}
