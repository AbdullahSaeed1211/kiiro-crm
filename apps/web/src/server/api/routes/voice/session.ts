import { stopVoiceSession, voiceSession, voiceSessionSchema } from '@ops/module-crm'
import { contractBody } from '../../contracts'
import { apiRoute, readBody } from '../../http'
import { voiceRuntime } from '@/server/voice/deps'

export const POST = apiRoute(async ({ request, context }) => {
  const body = await contractBody(request, 'voice.session')
  return body.ok ? voiceSession((await voiceRuntime(context)).deps, body.value) : body
})

/** Revoke a browser device session when its user stops receiving calls. */
export const DELETE = apiRoute(async ({ request, context }) => {
  const body = await readBody(request, voiceSessionSchema)
  return body.ok ? stopVoiceSession((await voiceRuntime(context)).deps, body.value) : body
})
