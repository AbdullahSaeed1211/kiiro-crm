import { getCloudflareContext } from '@opennextjs/cloudflare'
import { rejectUnauthorized } from '@ops/adapter-cloudflare'
import { z } from 'zod'
import { systemVoiceRuntime } from '@/server/voice/deps'
import { processVoiceEvents, reconcileVoiceCall, type VoiceEventProcessorDeps } from '@/server/voice/process'
import { persistVoiceRecording } from '@/server/voice/recordings'

const jobSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('events') }).strict(),
  z.object({ kind: z.literal('reconcile'), callId: z.string().min(1).max(180) }).strict(),
])

type Runtime = Awaited<ReturnType<typeof systemVoiceRuntime>>

function processingDeps(runtime: Runtime, bucket: R2Bucket): VoiceEventProcessorDeps | undefined {
  const provider = runtime.provider
  const queue = runtime.queue
  if (!runtime.configured || provider === null || queue === undefined) return undefined
  return {
    repo: runtime.repo,
    provider,
    connectionId: runtime.connectionId,
    applicationId: runtime.appId,
    offerSigningSecret: runtime.offerSigningSecret,
    now: Date.now,
    enqueueReconcile: async (callId, delaySeconds) => {
      await queue.send(
        { kind: 'reconcile', callId },
        { delaySeconds: Math.min(86400, Math.max(0, Math.ceil(delaySeconds))) },
      )
    },
    persistRecording: (call, recordingId, providerCallId) =>
      persistVoiceRecording({
        call,
        recordingId,
        providerCallId,
        provider,
        repo: runtime.repo,
        bucket,
      }),
  }
}

/** Receives queue work through the self binding; authentication precedes Payload initialization. */
export async function POST(request: Request): Promise<Response> {
  const { env } = await getCloudflareContext({ async: true })
  const unauthorized = await rejectUnauthorized(request, env.INTERNAL_SECRET)
  if (unauthorized !== undefined) return unauthorized
  const parsed = jobSchema.safeParse(await request.json().catch(() => undefined))
  if (!parsed.success) return Response.json({ error: 'Invalid voice job.' }, { status: 400 })
  try {
    const deps = processingDeps(await systemVoiceRuntime(), env.R2)
    if (deps === undefined) return Response.json({ error: 'Calling is unavailable.' }, { status: 503 })
    if (parsed.data.kind === 'reconcile') {
      await reconcileVoiceCall(deps, parsed.data.callId)
      return new Response(null, { status: 204 })
    }
    const result = await processVoiceEvents(deps)
    return Response.json(result, { status: result.failed > 0 ? 503 : 200 })
  } catch (error) {
    console.error(
      '[voice.process]',
      error instanceof Error ? { name: error.name, message: error.message } : 'Processing failed',
    )
    return Response.json({ error: 'Voice processing failed.' }, { status: 503 })
  }
}
