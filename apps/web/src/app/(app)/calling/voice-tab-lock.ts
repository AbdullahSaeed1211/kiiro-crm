'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

const LOCK_NAME = 'ops-voice-active-call'

/** Holds one browser tab as the active voice registration owner. */
export function useVoiceTabLock() {
  const [available, setAvailable] = useState(true)
  const release = useRef<(() => void) | null>(null)
  const channel = useRef<BroadcastChannel | null>(null)
  const ownsFallback = useRef(false)

  const acquire = useCallback(async () => {
    if (release.current !== null) return true
    const lockApi = Reflect.get(navigator, 'locks') as { request?: typeof navigator.locks.request } | undefined
    if (typeof lockApi?.request === 'function')
      return acquireWebLock(lockApi.request.bind(lockApi), release, setAvailable)
    return acquireBroadcastLock({ channelRef: channel, owns: ownsFallback, release, setAvailable })
  }, [])

  useEffect(
    () => () => {
      release.current?.()
      channel.current?.close()
    },
    [],
  )

  const unlock = useCallback(() => {
    release.current?.()
    release.current = null
  }, [])

  return { available, acquire, unlock }
}

async function acquireWebLock(
  request: typeof navigator.locks.request,
  release: { current: (() => void) | null },
  setAvailable: (available: boolean) => void,
): Promise<boolean> {
  let acquired = false
  let releasePromise!: () => void
  const hold = new Promise<void>((resolve) => {
    releasePromise = resolve
  })
  void request('ops-voice-active-call', { mode: 'exclusive', ifAvailable: true }, async (lock) => {
    if (lock === null) return
    acquired = true
    release.current = releasePromise
    setAvailable(true)
    await hold
    release.current = null
  })
  await new Promise((resolve) => window.setTimeout(resolve, 20))
  setAvailable(acquired)
  return acquired
}

async function acquireBroadcastLock({
  channelRef,
  owns,
  release,
  setAvailable,
}: Readonly<{
  channelRef: { current: BroadcastChannel | null }
  owns: { current: boolean }
  release: { current: (() => void) | null }
  setAvailable: (available: boolean) => void
}>): Promise<boolean> {
  const channel = channelRef.current ?? new BroadcastChannel(LOCK_NAME)
  channelRef.current = channel
  const occupied = await new Promise<boolean>((resolve) => {
    const timeout = window.setTimeout(() => {
      resolve(false)
    }, 80)
    channel.onmessage = (event: MessageEvent) => {
      if (event.data === 'claim' && owns.current) channel.postMessage('owned')
      if (event.data !== 'owned') return
      window.clearTimeout(timeout)
      resolve(true)
    }
    channel.postMessage('claim')
  })
  setAvailable(!occupied)
  if (occupied) return false
  owns.current = true
  release.current = () => {
    owns.current = false
    channel.postMessage('released')
  }
  return true
}
