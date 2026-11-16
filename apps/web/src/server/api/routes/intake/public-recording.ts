import {
  MAX_ATTACHMENT_BYTES,
  validAudioFileHeader,
  validateAttachment,
} from '../../../../../../../packages/adapters/payload/src/collaboration/files'
import type { IntakeForm, IntakeStore } from '@ops/module-intake'

const MAX_MULTIPART_BYTES = MAX_ATTACHMENT_BYTES + 128 * 1024
const RECORDING_MARKER = 'recording-attached'
const TURNSTILE_FIELD = 'cf-turnstile-response'

export interface IntakeRecording {
  readonly file: File
  readonly header: Uint8Array
}

export interface IntakeCapture {
  submissionId?: string
  leadId?: string
}

export type ParsedSubmission =
  | Readonly<{ ok: true; request: Request; recording?: IntakeRecording }>
  | Readonly<{ ok: false; status: number; message: string }>

type MultipartData = Readonly<{ ok: true; payload: Record<string, unknown> }> | Readonly<{ ok: false }>
type RecordingPart = Readonly<{ ok: true; recording?: IntakeRecording }> | Readonly<{ ok: false; message: string }>

function failure(status: number, message: string): ParsedSubmission {
  return { ok: false, status, message }
}

function jsonRequest(request: Request, payload: Readonly<Record<string, unknown>>): Request {
  const headers = new Headers(request.headers)
  headers.delete('content-length')
  headers.set('content-type', 'application/json')
  return new Request(request.url, { method: request.method, headers, body: JSON.stringify(payload) })
}

async function readChunks(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  limit: number,
): Promise<Uint8Array[] | undefined> {
  const chunks: Uint8Array[] = []
  let size = 0
  let reading = true
  while (reading) {
    const part = await reader.read()
    if (part.done) reading = false
    else {
      size += part.value.byteLength
      if (size > limit) {
        await reader.cancel()
        return undefined
      }
      chunks.push(part.value)
    }
  }
  return chunks
}

function combineChunks(chunks: readonly Uint8Array[]): Uint8Array {
  const size = chunks.reduce((total, chunk) => total + chunk.byteLength, 0)
  const bytes = new Uint8Array(size)
  let offset = 0
  for (const chunk of chunks) {
    bytes.set(chunk, offset)
    offset += chunk.byteLength
  }
  return bytes
}

async function boundedBytes(
  request: Pick<Request, 'headers' | 'body'>,
  maxBytes: number,
): Promise<Uint8Array | undefined> {
  const statedLength = Number(request.headers.get('content-length') ?? '')
  if (Number.isFinite(statedLength) && statedLength > maxBytes) return undefined
  if (request.body === null) return new Uint8Array()
  const reader = request.body.getReader()
  try {
    const chunks = await readChunks(reader, maxBytes)
    return chunks === undefined ? undefined : combineChunks(chunks)
  } finally {
    reader.releaseLock()
  }
}

function requestFromBytes(request: Request, bytes: Uint8Array): Request {
  return new Request(request.url, {
    method: request.method,
    headers: request.headers,
    body: bytes.buffer as ArrayBuffer,
  })
}

function objectPayload(value: unknown): Record<string, unknown> | undefined {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined
}

function convertDateAnswers(payload: Record<string, unknown>, form: IntakeForm): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(payload).map(([key, value]) => {
      const field = form.formFields?.find((item) => item.key === key)
      return [key, field?.type === 'datetime' && typeof value === 'string' && value !== '' ? Number(value) : value]
    }),
  )
}

async function parseJsonSubmission(
  request: Request,
  form: IntakeForm,
  audioKey: string | undefined,
): Promise<ParsedSubmission> {
  const bytes = await boundedBytes(request.clone(), 16 * 1024)
  if (bytes === undefined) return failure(413, 'intake payload exceeds 16 KB')
  let parsed: unknown
  try {
    parsed = JSON.parse(new TextDecoder().decode(bytes))
  } catch {
    return failure(400, 'request body is invalid')
  }
  const payload = objectPayload(parsed)
  if (payload === undefined) return failure(400, 'intake payload must be an object')
  if (audioKey !== undefined && audioKey in payload && payload[audioKey] !== '')
    return failure(400, 'Call recordings must be uploaded as a file.')
  return { ok: true, request: jsonRequest(request, convertDateAnswers(payload, form)) }
}

async function formDataOf(request: Request, bytes: Uint8Array): Promise<FormData | undefined> {
  try {
    return await requestFromBytes(request, bytes).formData()
  } catch {
    return undefined
  }
}

function hasOnlyKnownMultipartFields(data: FormData, form: IntakeForm): boolean {
  const allowed = new Set([...(form.formFields ?? []).map((field) => field.key), TURNSTILE_FIELD])
  return [...data.keys()].every((key) => allowed.has(key))
}

function fieldValue(
  data: FormData,
  field: NonNullable<IntakeForm['formFields']>[number],
): { ok: true; present: false } | { ok: true; present: true; value: unknown } | { ok: false } {
  if (field.type === 'audio') return { ok: true, present: false }
  const values = data.getAll(field.key)
  if (values.length === 0) return { ok: true, present: false }
  if (values.length !== 1 || typeof values[0] !== 'string') return { ok: false }
  const value = values[0]
  return { ok: true, present: true, value: field.type === 'datetime' && value !== '' ? Number(value) : value }
}

function answerFields(data: FormData, form: IntakeForm): Record<string, unknown> | undefined {
  const payload: Record<string, unknown> = {}
  for (const field of form.formFields ?? []) {
    const result = fieldValue(data, field)
    if (!result.ok) return undefined
    if (result.present) payload[field.key] = result.value
  }
  return payload
}

function validTurnstilePart(data: FormData): boolean {
  const tokenValues = data.getAll(TURNSTILE_FIELD)
  return tokenValues.length <= 1 && (tokenValues.length === 0 || typeof tokenValues[0] === 'string')
}

function multipartPayload(data: FormData, form: IntakeForm): MultipartData {
  if (!hasOnlyKnownMultipartFields(data, form) || !validTurnstilePart(data)) return { ok: false }
  const payload = answerFields(data, form)
  if (payload === undefined) return { ok: false }
  const token = data.get(TURNSTILE_FIELD)
  if (typeof token === 'string') payload[TURNSTILE_FIELD] = token
  return { ok: true, payload }
}

function selectedFile(data: FormData, key: string): File | undefined {
  const entries = data.getAll(key)
  if (entries.length !== 1 || !(entries[0] instanceof File)) return undefined
  const file = entries[0]
  return file.size > 0 || file.name !== '' ? file : undefined
}

function noFilePart(entries: FormDataEntryValue[]): boolean {
  return entries.length === 0 || (entries.length === 1 && entries[0] instanceof File && entries[0].size === 0)
}

async function recordingPart(data: FormData, key: string | undefined): Promise<RecordingPart> {
  if (key === undefined) return { ok: true }
  const entries = data.getAll(key)
  if (noFilePart(entries)) return { ok: true }
  const file = selectedFile(data, key)
  if (file === undefined) return { ok: false, message: 'Call recording must be uploaded as a file.' }
  const error = validateAttachment(file)
  if (error !== undefined) return { ok: false, message: error }
  const header = new Uint8Array(await file.slice(0, 16).arrayBuffer())
  if (!validAudioFileHeader({ name: file.name, type: file.type, header }))
    return { ok: false, message: 'Choose a valid MP3, M4A, WAV, OGG, or WebM audio file.' }
  return { ok: true, recording: { file, header } }
}

async function parseMultipartSubmission(
  request: Request,
  form: IntakeForm,
  audioKey: string | undefined,
): Promise<ParsedSubmission> {
  const bytes = await boundedBytes(request, MAX_MULTIPART_BYTES)
  if (bytes === undefined) return failure(413, 'Call recording upload exceeds 10 MB.')
  const data = await formDataOf(request, bytes)
  if (data === undefined) return failure(400, 'The form submission is invalid.')
  const multipart = multipartPayload(data, form)
  if (!multipart.ok) return failure(400, 'The form contains an unsupported or invalid field.')
  const file = await recordingPart(data, audioKey)
  if (!file.ok) return failure(400, file.message)
  const payload = { ...multipart.payload }
  if (file.recording !== undefined && audioKey !== undefined) payload[audioKey] = RECORDING_MARKER
  return {
    ok: true,
    request: jsonRequest(request, payload),
    ...(file.recording === undefined ? {} : { recording: file.recording }),
  }
}

/** Bounded parser that only accepts one configured audio file field on multipart public submissions. */
export async function parsePublicSubmission(request: Request, form: IntakeForm | undefined): Promise<ParsedSubmission> {
  if (request.method !== 'POST' || form === undefined) return { ok: true, request }
  return parseContentType(request, form)
}

async function parseContentType(request: Request, form: IntakeForm): Promise<ParsedSubmission> {
  const type = (request.headers.get('content-type') ?? '').split(';', 1)[0]?.trim().toLowerCase()
  const audioKey = form.formFields?.find((field) => field.type === 'audio')?.key
  if (type === 'multipart/form-data') return parseMultipartSubmission(request, form, audioKey)
  if (type === 'application/json') return jsonSubmission(request, form, audioKey)
  return { ok: true, request }
}

async function jsonSubmission(
  request: Request,
  form: IntakeForm,
  audioKey: string | undefined,
): Promise<ParsedSubmission> {
  return audioKey === undefined ? { ok: true, request } : parseJsonSubmission(request, form, audioKey)
}

/** Captures the lead and submission produced by this one validated intake request for a scoped file write. */
export function captureIntakeSubmission(store: IntakeStore, capture: IntakeCapture): IntakeStore {
  return {
    ...store,
    findByDedupeKey: async (key) => {
      const submission = await store.findByDedupeKey(key)
      if (submission !== undefined) {
        capture.submissionId = submission.id
        capture.leadId = submission.recordRef?.id
      }
      return submission
    },
    insertSubmission: async (submission) => {
      const inserted = await store.insertSubmission(submission)
      if (inserted.ok) capture.submissionId = inserted.value.id
      return inserted
    },
    createLead: async (input, schedule) => {
      const lead = await store.createLead(input, schedule)
      capture.submissionId = schedule?.submissionId ?? capture.submissionId
      capture.leadId = lead.id
      return lead
    },
  }
}
