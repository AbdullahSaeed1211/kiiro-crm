import { updateVoiceSettings } from '@ops/module-crm'
import { contractBody } from '../../contracts'
import { apiRoute } from '../../http'
import { voiceRuntime } from '@/server/voice/deps'

export const PATCH = apiRoute(async ({ request, context }) => {
  const body = await contractBody(request, 'voice.settings.update')
  return body.ok ? updateVoiceSettings((await voiceRuntime(context)).deps, body.value) : body
})
