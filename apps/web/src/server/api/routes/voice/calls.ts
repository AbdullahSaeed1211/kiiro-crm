import { actionVoiceCall, startVoiceCall } from '@ops/module-crm'
import { contractBody } from '../../contracts'
import { apiRoute } from '../../http'
import { voiceRuntime } from '@/server/voice/deps'
import { persistVoiceWrapup } from '@/server/voice/wrapup'

export const POST = apiRoute(async ({ request, context }) => {
  const body = await contractBody(request, 'voice.calls.create')
  if (!body.ok) return body
  const runtime = await voiceRuntime(context)
  const result = await startVoiceCall(runtime.deps, body.value)
  if (result.ok && runtime.queue !== undefined) {
    await runtime.queue.send(
      { kind: 'reconcile', callId: result.value.call.id },
      { delaySeconds: Math.max(10, Math.min(120, (await runtime.deps.repo.loadSettings()).maxCallSeconds)) },
    )
  }
  return result
}, 201)

export const patchVoiceCallRoute = apiRoute<{ id: string }>(async ({ request, params, context }) => {
  const body = await contractBody(request, 'voice.calls.action')
  if (!body.ok) return body
  const result = await actionVoiceCall((await voiceRuntime(context)).deps, params.id, body.value)
  if (result.ok && body.value.action === 'wrapup')
    await persistVoiceWrapup(context.req, String(context.actor.id), result.value)
  return result
})
