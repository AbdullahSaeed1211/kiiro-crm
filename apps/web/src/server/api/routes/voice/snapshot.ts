import { voiceSnapshot } from '@ops/module-crm'
import { apiRoute } from '../../http'
import { voiceRuntime } from '@/server/voice/deps'

export const GET = apiRoute(async ({ context }) => voiceSnapshot((await voiceRuntime(context)).deps))
