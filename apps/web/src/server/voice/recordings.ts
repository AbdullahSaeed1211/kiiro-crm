import type { VoiceCall, VoiceProvider, VoiceRepository } from '@ops/module-crm'

const MAX_RECORDING_BYTES = 100 * 1024 * 1024
const AUDIO_TYPES = new Set(['audio/mpeg', 'audio/wav', 'audio/x-wav'])

export function voiceRecordingKey(callId: string, recordingId: string): string {
  return `voice-recordings/${encodeURIComponent(callId)}/${encodeURIComponent(recordingId)}`
}

interface RecordingMedia {
  readonly body: ReadableStream<Uint8Array>
  readonly contentType: string
  readonly contentLength: number
}

function validRecordingSize(media: RecordingMedia): boolean {
  return (
    Number.isSafeInteger(media.contentLength) && media.contentLength > 0 && media.contentLength <= MAX_RECORDING_BYTES
  )
}

async function storeRecording(key: string, media: RecordingMedia, bucket: R2Bucket): Promise<boolean> {
  if (!AUDIO_TYPES.has(media.contentType) || !validRecordingSize(media))
    throw new Error('Provider returned an invalid recording.')
  let bytes = 0
  const fixedLength = new FixedLengthStream(media.contentLength)
  const boundedBody = media.body.pipeThrough(
    new TransformStream<Uint8Array, Uint8Array>({
      transform(chunk, controller) {
        bytes += chunk.byteLength
        if (bytes > media.contentLength) throw new Error('Call recording exceeds its declared size.')
        controller.enqueue(chunk)
      },
    }),
  )
  const controller = new AbortController()
  const writing = boundedBody.pipeTo(fixedLength.writable, { signal: controller.signal })
  const outcome = writing.then(
    () => undefined,
    (error: unknown) => error,
  )
  try {
    const stored = await bucket.put(key, fixedLength.readable, {
      onlyIf: { etagDoesNotMatch: '*' },
      httpMetadata: { contentType: media.contentType },
    })
    if (stored === null) controller.abort()
    const failure = await outcome
    if (stored !== null && failure !== undefined) throw new Error('Call recording transfer failed', { cause: failure })
    return stored !== null
  } finally {
    controller.abort()
    await outcome
  }
}

async function hasStoredRecording(key: string, media: RecordingMedia, bucket: R2Bucket): Promise<boolean> {
  const existing = await bucket.head(key)
  return (
    existing !== null &&
    existing.size === media.contentLength &&
    existing.httpMetadata?.contentType === media.contentType
  )
}

function isReadyRecording(call: VoiceCall | undefined, key: string): boolean {
  return call?.recordingState === 'ready' && call.recordingFileId === key
}

function isPendingRecording(call: VoiceCall | undefined, recordingId: string): call is VoiceCall {
  return call?.recordingId === recordingId && call.recordingState === 'pending'
}

async function markRecordingReady({
  call,
  recordingId,
  key,
  repo,
}: Readonly<{
  call: VoiceCall
  recordingId: string
  key: string
  repo: VoiceRepository
}>): Promise<boolean> {
  const current = await repo.getCall(call.id)
  if (isReadyRecording(current, key)) return true
  if (!isPendingRecording(current, recordingId)) return false
  const updated = await repo.updateCall(
    call.id,
    {
      recordingFileId: key,
      recordingState: 'ready',
      updatedAt: Date.now(),
    },
    { updatedAt: current.updatedAt },
  )
  if (updated !== undefined) return true
  const raced = await repo.getCall(call.id)
  return isReadyRecording(raced, key)
}

/** Fetches a trusted provider recording and stores it in the tenant-private bucket before marking it ready. */
export async function persistVoiceRecording({
  call,
  recordingId,
  providerCallId,
  provider,
  repo,
  bucket,
}: Readonly<{
  call: VoiceCall
  recordingId: string
  providerCallId: string
  provider: VoiceProvider
  repo: VoiceRepository
  bucket: R2Bucket
}>): Promise<void> {
  if (call.recordingState !== 'pending' || call.recordingId !== recordingId) return
  const key = voiceRecordingKey(call.id, recordingId)
  const media = await provider.downloadRecording(recordingId, providerCallId)
  const stored = await storeRecording(key, media, bucket)
  if (!stored && !(await hasStoredRecording(key, media, bucket))) return
  if (!(await markRecordingReady({ call, recordingId, key, repo }))) {
    throw new Error('Recording state changed before storage was confirmed')
  }
}
