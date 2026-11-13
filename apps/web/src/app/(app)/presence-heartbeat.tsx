'use client'

import { useEffect } from 'react'
import { heartbeatPresence } from '../../server/actions/presence'

const HEARTBEAT_MS = 60_000
const IDLE_MS = 2 * 60_000

/** Reports recent interaction while the app is visible; idling and closing a tab stop heartbeats. */
export function PresenceHeartbeat() {
  useEffect(() => {
    let lastActivityAt = Date.now()
    let heartbeatPending = false
    const markActivity = () => {
      lastActivityAt = Date.now()
    }
    const reportIfActive = () => {
      if (heartbeatPending || document.visibilityState !== 'visible' || Date.now() - lastActivityAt > IDLE_MS) return
      heartbeatPending = true
      void heartbeatPresence()
        .catch(() => undefined)
        .finally(() => {
          heartbeatPending = false
        })
    }
    const events: readonly (keyof WindowEventMap)[] = ['pointerdown', 'keydown', 'touchstart', 'scroll']
    for (const event of events) window.addEventListener(event, markActivity, { passive: true })
    document.addEventListener('visibilitychange', reportIfActive)
    reportIfActive()
    const timer = window.setInterval(reportIfActive, HEARTBEAT_MS)
    return () => {
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', reportIfActive)
      for (const event of events) window.removeEventListener(event, markActivity)
    }
  }, [])
  return null
}
