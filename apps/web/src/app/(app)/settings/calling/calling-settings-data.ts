'use client'

import type { VoiceNumber, VoiceOffer, VoiceSettings, VoiceSnapshot } from '@ops/module-crm'
import { useCallback, useEffect, useState } from 'react'
import type { CallingCopy } from '../../../../i18n/calling-copy'
import { voiceApi } from '../../calling/voice-api'

interface State {
  snapshot: VoiceSnapshot | null
  settings: VoiceSettings | null
  offers: VoiceOffer[]
  selectedOffer: VoiceOffer | null
  areaCode: string
  busy: boolean
  error: string | null
  message: string | null
}

const INITIAL: State = {
  snapshot: null,
  settings: null,
  offers: [],
  selectedOffer: null,
  areaCode: '',
  busy: false,
  error: null,
  message: null,
}

function failureMessage(cause: unknown, fallback: string): string {
  return cause instanceof Error ? cause.message : fallback
}

async function mutateNumber({
  number,
  method,
  refresh,
}: Readonly<{ number: VoiceNumber; method: 'PATCH' | 'DELETE'; refresh: () => Promise<void> }>): Promise<void> {
  const body =
    method === 'DELETE'
      ? { requestKey: crypto.randomUUID() }
      : {
          label: number.label,
          assigneeIds: number.assigneeIds,
          inboundEnabled: number.inboundEnabled,
          outboundEnabled: number.outboundEnabled,
          recordingEnabled: number.recordingEnabled,
        }
  await voiceApi(`/numbers/${encodeURIComponent(number.id)}`, { method, body: JSON.stringify(body) })
  await refresh()
}

/** Owns the calling settings requests and editable state, apart from their presentation. */
export function useCallingSettingsData(copy: CallingCopy) {
  const [state, setState] = useState(INITIAL)
  const patch = useCallback((value: Partial<State>) => {
    setState((current) => ({ ...current, ...value }))
  }, [])
  const refresh = useCallback(async () => {
    try {
      const snapshot = await voiceApi<VoiceSnapshot>('')
      patch({ snapshot, settings: snapshot.settings, error: null })
    } catch (cause) {
      patch({ error: failureMessage(cause, copy.error) })
    }
  }, [copy.error, patch])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const actions = useCallingSettingsActions({ state, patch, refresh, copy })
  const setSettings = useCallback(
    (settings: VoiceSettings) => {
      patch({ settings })
    },
    [patch],
  )
  const setAreaCode = useCallback(
    (areaCode: string) => {
      patch({ areaCode })
    },
    [patch],
  )
  const setOffer = useCallback(
    (selectedOffer: VoiceOffer | null) => {
      patch({ selectedOffer })
    },
    [patch],
  )
  return { state, setSettings, setAreaCode, setOffer, ...actions }
}

function useCallingSettingsActions(
  input: Readonly<{
    state: State
    patch: (value: Partial<State>) => void
    refresh: () => Promise<void>
    copy: CallingCopy
  }>,
) {
  return {
    ...useSettingsActions(input),
    ...useNumberActions(input),
  }
}

function useSettingsActions({
  state,
  patch,
  copy,
}: Readonly<{
  state: State
  patch: (value: Partial<State>) => void
  copy: CallingCopy
}>) {
  const saveSettings = useCallback(async () => {
    if (state.settings === null) return
    patch({ busy: true })
    try {
      const settings = await voiceApi<VoiceSettings>('/settings', {
        method: 'PATCH',
        body: JSON.stringify(state.settings),
      })
      patch({ settings, message: copy.saveSettings })
    } catch (cause) {
      patch({ error: failureMessage(cause, copy.error) })
    } finally {
      patch({ busy: false })
    }
  }, [copy.error, copy.saveSettings, patch, state.settings])

  const search = useCallback(async () => {
    patch({ busy: true, error: null })
    try {
      const result = await voiceApi<{ offers: VoiceOffer[] }>(
        `/numbers/search?areaCode=${encodeURIComponent(state.areaCode)}`,
      )
      patch({ offers: result.offers, message: result.offers.length === 0 ? copy.noOffers : null })
    } catch (cause) {
      patch({ error: failureMessage(cause, copy.error) })
    } finally {
      patch({ busy: false })
    }
  }, [copy.error, copy.noOffers, patch, state.areaCode])

  return { saveSettings, search }
}

function useNumberActions({
  refresh,
  patch,
  copy,
}: Readonly<{
  refresh: () => Promise<void>
  patch: (value: Partial<State>) => void
  copy: CallingCopy
}>) {
  const buy = useCallback(
    async (offer: VoiceOffer) => {
      patch({ busy: true, error: null })
      try {
        await voiceApi('/numbers', {
          method: 'POST',
          body: JSON.stringify({ offerToken: offer.token, requestKey: crypto.randomUUID() }),
        })
        patch({ selectedOffer: null, message: copy.purchasePending })
        await refresh()
      } catch (cause) {
        patch({ error: failureMessage(cause, copy.error) })
      } finally {
        patch({ busy: false })
      }
    },
    [copy.error, copy.purchasePending, patch, refresh],
  )

  const saveNumber = useCallback((number: VoiceNumber) => mutateNumber({ number, method: 'PATCH', refresh }), [refresh])
  const releaseNumber = useCallback(
    (number: VoiceNumber) => mutateNumber({ number, method: 'DELETE', refresh }),
    [refresh],
  )

  return { buy, saveNumber, releaseNumber }
}
