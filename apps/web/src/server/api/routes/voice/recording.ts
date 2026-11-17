import { getCloudflareContext } from '@opennextjs/cloudflare'
import { isManagerUp } from '@ops/platform'
import { findProductContext } from '@/server/auth/context'
import { failure } from '../../respond'
import { voiceRuntime } from '@/server/voice/deps'
import { voiceRecordingKey } from '@/server/voice/recordings'

const RECORDING_NOT_FOUND = 'Recording not found.'
const PRIVATE_HEADERS = {
  'Cache-Control': 'private, no-store',
  'X-Content-Type-Options': 'nosniff',
  'Accept-Ranges': 'none',
}

interface Params {
  readonly params: Promise<{ id: string }>
}

function privateAudioHeaders(contentType: string, size: number): Headers {
  const extension = contentType === 'audio/mpeg' ? 'mp3' : 'wav'
  return new Headers({
    'Content-Type': contentType,
    'Content-Length': String(size),
    'Content-Disposition': `inline; filename="call-recording.${extension}"`,
    ...PRIVATE_HEADERS,
  })
}

async function readableCall({
  id,
  runtime,
  context,
}: Readonly<{
  id: string
  runtime: Awaited<ReturnType<typeof voiceRuntime>>
  context: NonNullable<Awaited<ReturnType<typeof findProductContext>>>
}>) {
  const call = await runtime.repo.getCall(id)
  if (call === undefined) return undefined
  const privileged = isManagerUp(context.actor)
  const ownCall = call.userId === context.actor.id || call.assignedUserIds.includes(context.actor.id)
  if (privileged || ownCall) return call
  const readableLead = call.leadId !== null && (await runtime.repo.canReadLead(context.actor.id, call.leadId))
  return readableLead ? call : undefined
}

async function streamRecording(callId: string, recordingId: string, fileId: string): Promise<Response> {
  if (fileId !== voiceRecordingKey(callId, recordingId)) return failure('NOT_FOUND', RECORDING_NOT_FOUND)
  const { env } = await getCloudflareContext({ async: true })
  const object = await env.R2.get(fileId)
  if (object === null) return failure('NOT_FOUND', RECORDING_NOT_FOUND)
  const contentType = object.httpMetadata?.contentType
  if (contentType !== 'audio/mpeg' && contentType !== 'audio/wav' && contentType !== 'audio/x-wav')
    return failure('NOT_FOUND', RECORDING_NOT_FOUND)
  return new Response(object.body, { headers: privateAudioHeaders(contentType, object.size) })
}

/** Streams a private R2 recording after checking call ownership or CRM lead access. */
export async function GET(_request: Request, { params }: Params): Promise<Response> {
  const context = await findProductContext()
  if (context === null) return failure('UNAUTHORIZED', 'Sign in to access this recording.')
  const { id } = await params
  try {
    const runtime = await voiceRuntime(context)
    const call = await readableCall({ id, runtime, context })
    if (call?.recordingState !== 'ready' || call.recordingId === null || call.recordingFileId === null)
      return failure('NOT_FOUND', RECORDING_NOT_FOUND)
    return await streamRecording(call.id, call.recordingId, call.recordingFileId)
  } catch {
    return failure('INTERNAL', 'Unable to retrieve the call recording.')
  }
}
