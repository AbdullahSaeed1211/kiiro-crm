import { purchaseVoiceNumber, searchVoiceNumbers, updateVoiceNumber, releaseVoiceNumber } from '@ops/module-crm'
import { contractBody } from '../../contracts'
import { apiRoute } from '../../http'
import { voiceRuntime } from '@/server/voice/deps'
import { voiceNumberSearchSchema } from '@ops/module-crm'
import { domainError, err, ok } from '@ops/kernel'

export const GET = apiRoute(async ({ request, context }) => {
  const query = voiceNumberSearchSchema.safeParse({ areaCode: new URL(request.url).searchParams.get('areaCode') ?? '' })
  if (!query.success) return err(domainError('VALIDATION', 'Enter a valid US area code.'))
  const result = await searchVoiceNumbers((await voiceRuntime(context)).deps, query.data)
  return result.ok ? ok({ offers: result.value }) : result
})

export const POST = apiRoute(async ({ request, context }) => {
  const body = await contractBody(request, 'voice.numbers.purchase')
  return body.ok ? purchaseVoiceNumber((await voiceRuntime(context)).deps, body.value) : body
}, 201)

export const patchVoiceNumberRoute = apiRoute<{ id: string }>(async ({ request, params, context }) => {
  const body = await contractBody(request, 'voice.numbers.update')
  return body.ok ? updateVoiceNumber((await voiceRuntime(context)).deps, params.id, body.value) : body
})

export const deleteVoiceNumberRoute = apiRoute<{ id: string }>(async ({ request, params, context }) => {
  const body = await contractBody(request, 'voice.numbers.release')
  return body.ok ? releaseVoiceNumber((await voiceRuntime(context)).deps, params.id, body.value) : body
})
