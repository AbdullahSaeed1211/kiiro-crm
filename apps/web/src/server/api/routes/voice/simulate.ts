import { isVoiceManager } from '@ops/module-crm'
import { domainError, err, ok } from '@ops/kernel'
import type { Result } from '@ops/kernel'
import type { VoiceNumber } from '@ops/module-crm'
import { z } from 'zod'
import { apiRoute } from '../../http'
import { voiceRuntime, type VoiceRuntime } from '@/server/voice/deps'
import { simulateInbound } from './simulate-inbound'
import type { ProductContext } from '@/server/auth/context'

const schema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('setup') }),
  z.object({ action: z.literal('inbound'), numberId: z.string().min(1), from: z.string().regex(/^\+1[2-9]\d{9}$/u) }),
])

/** Run local-only calling fixtures without buying numbers or placing provider calls. */
export const POST = apiRoute(async ({ request, context }) => {
  const runtime = await voiceRuntime(context)
  const authorized = authorizeSimulator(runtime, context)
  if (!authorized.ok) return authorized
  const body = await readSimulationRequest(request)
  if (!body.ok) return body
  return body.value.action === 'setup'
    ? setupSimulatorLine(runtime, String(context.actor.id))
    : simulateInbound(runtime, body.value.numberId, body.value.from)
})

function authorizeSimulator(runtime: VoiceRuntime, context: ProductContext): Result<true> {
  if (runtime.production || runtime.config.mode !== 'simulator' || runtime.provider?.mode !== 'simulator') {
    return err(domainError('UNAVAILABLE', 'The calling simulator is only available in local simulator mode.'))
  }
  return isVoiceManager(context.actor)
    ? ok(true)
    : err(domainError('FORBIDDEN', 'Only workspace managers can use the calling simulator.'))
}

async function readSimulationRequest(request: Request): Promise<Result<z.output<typeof schema>>> {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return err(domainError('VALIDATION', 'Send a JSON request body.'))
  }
  const parsed = schema.safeParse(body)
  return parsed.success ? ok(parsed.data) : err(domainError('VALIDATION', 'The simulator request is invalid.'))
}

async function setupSimulatorLine(
  runtime: VoiceRuntime,
  userId: string,
): Promise<Result<{ readonly number: VoiceNumber }>> {
  const e164 = '+12125550101'
  const existing = (await runtime.repo.listNumbers()).find((number) => number.e164 === e164)
  if (existing !== undefined) return ok({ number: existing })
  const number: VoiceNumber = {
    id: crypto.randomUUID(),
    e164,
    label: 'Local test line',
    assigneeIds: [userId],
    status: 'active',
    inboundEnabled: true,
    outboundEnabled: true,
    recordingEnabled: false,
    providerNumberId: `sim-number-${crypto.randomUUID()}`,
    providerOrderId: null,
    monthlyCost: null,
    setupCost: null,
    updatedAt: Date.now(),
  }
  await runtime.repo.saveNumber(number)
  return ok({ number })
}
