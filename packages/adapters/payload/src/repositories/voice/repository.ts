import { createLocalReq, type Payload, type PayloadRequest } from 'payload'
import type { VoiceRepository } from '@ops/module-crm'

import { createVoiceRecordsRepository } from './records'
import { createVoiceCallsRepository } from './calls'
import { createVoiceDevicesRepository } from './devices'
import { createVoiceInboxRepository } from './inbox'

function buildVoiceRepository(req: PayloadRequest, systemMode: boolean): VoiceRepository {
  return {
    ...createVoiceRecordsRepository(req, systemMode),
    ...createVoiceCallsRepository(req, systemMode),
    ...createVoiceDevicesRepository(req, systemMode),
    ...createVoiceInboxRepository(req),
  } as VoiceRepository
}

/** Server-only repository for provider webhooks and scheduled reconciliation. */
export async function createSystemVoiceRepository(payload: Payload): Promise<VoiceRepository> {
  const req = await createLocalReq({}, payload)
  return buildVoiceRepository(req, true)
}

/** Request-scoped repository used by authenticated voice commands. */
export function createVoiceRepository(req: PayloadRequest): VoiceRepository {
  return buildVoiceRepository(req, false)
}
