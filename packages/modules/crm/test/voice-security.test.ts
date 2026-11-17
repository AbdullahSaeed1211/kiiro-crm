import { describe, expect, it } from 'vitest'
import { signVoiceClientState, verifyParkedCallClientState } from '../src/voice-security'

const secret = 'local-voice-security-test-secret-32-characters'
const now = 1_800_000_000_000
const reservation = { callId: 'call-1', userId: 'user-1', deviceId: 'device-1', to: '+12125550101', exp: now + 1000 }

describe('parked call authorization', () => {
  it('rejects a modified destination and an unrelated reservation', async () => {
    const signed = await signVoiceClientState(secret, reservation)
    const decoded: unknown = JSON.parse(atob(signed))
    if (typeof decoded !== 'object' || decoded === null) throw new Error('Expected signed metadata')
    const altered = btoa(JSON.stringify({ ...decoded, to: '+12125550102' }))
    expect(await verifyParkedCallClientState({ secret, callId: 'call-1', encoded: altered, now })).toBeUndefined()
    expect(await verifyParkedCallClientState({ secret, callId: 'call-2', encoded: signed, now })).toBeUndefined()
    expect(await verifyParkedCallClientState({ secret, callId: 'call-1', encoded: signed, now })).toEqual(reservation)
  })

  it('rejects expired authorization and authorization signed by another tenant', async () => {
    const signed = await signVoiceClientState(secret, reservation)
    expect(
      await verifyParkedCallClientState({ secret, callId: 'call-1', encoded: signed, now: reservation.exp }),
    ).toBeUndefined()
    expect(
      await verifyParkedCallClientState({ secret: `${secret}-other`, callId: 'call-1', encoded: signed, now }),
    ).toBeUndefined()
  })

  it('rejects malformed public metadata without throwing', async () => {
    for (const input of ['not-base64!', btoa('null'), btoa('[]'), btoa('{"sig":"!.!"}')]) {
      await expect(
        verifyParkedCallClientState({ secret, callId: 'call-1', encoded: input, now }),
      ).resolves.toBeUndefined()
    }
  })
})
