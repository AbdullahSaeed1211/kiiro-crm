'use client'

import type { VoiceClientSession, VoiceDialResult } from '@ops/module-crm'

export interface BrowserCall {
  state?: string
  isAudioMuted?: boolean
  answer: (options?: { localStream?: MediaStream; remoteElement?: HTMLMediaElement }) => Promise<void>
  hangup: () => void | Promise<void>
  dtmf: (digit: string) => void
  muteAudio: () => void
  unmuteAudio: () => void
  hold: () => Promise<unknown>
  unhold: () => Promise<unknown>
}

interface TelnyxClient {
  connect: () => Promise<void>
  login: (options: { creds: { login_token: string } }) => Promise<void>
  disconnect: () => Promise<void>
  newCall: (options: {
    destinationNumber: string
    clientState: string
    localStream: MediaStream
    remoteElement: HTMLMediaElement
  }) => BrowserCall
  on: (event: string, listener: (event: unknown) => void) => void
}

/** Browser-only SDK boundary. Credentials are accepted at runtime and never persisted. */
export class VoiceBrowserClient {
  private client: TelnyxClient | null = null
  private call: BrowserCall | null = null
  private localStream: MediaStream | null = null
  private remoteElement: HTMLAudioElement | null = null

  get connected(): boolean {
    return this.client !== null
  }

  async connect(session: VoiceClientSession, onCall: (call: BrowserCall) => void): Promise<void> {
    if (session.mode !== 'telnyx' || this.client !== null) return
    const { TelnyxRTC } = await import('@telnyx/webrtc')
    const client = new TelnyxRTC({ login_token: session.token, hangupOnBeforeUnload: false }) as unknown as TelnyxClient
    const ready = waitForSdkReady(client)
    client.on('telnyx.notification', (event: unknown) => {
      const notification = event as { type?: string; call?: BrowserCall }
      if (notification.type !== 'callUpdate' || notification.call === undefined) return
      this.call = notification.call
      onCall(notification.call)
      if (isCallEnded(notification.call.state)) this.releaseCallMedia()
    })
    this.client = client
    try {
      const connecting = client.connect()
      await Promise.all([connecting, ready])
    } catch (cause) {
      await client.disconnect()
      this.client = null
      throw cause
    }
  }

  async renewToken(session: VoiceClientSession): Promise<void> {
    if (this.client === null || session.mode !== 'telnyx') return
    await this.client.login({ creds: { login_token: session.token } })
  }

  dial(result: VoiceDialResult, localStream: MediaStream): void {
    if (this.client === null) throw new Error('Voice browser is not connected.')
    this.localStream = localStream
    this.call = this.client.newCall({
      destinationNumber: result.browserDestination,
      clientState: result.clientState,
      localStream,
      remoteElement: this.createRemoteAudio(),
    })
  }

  async answer(localStream: MediaStream | undefined): Promise<void> {
    if (this.call === null) throw new Error('No browser call is waiting.')
    if (localStream !== undefined) this.localStream = localStream
    await this.call.answer({
      ...(localStream === undefined ? {} : { localStream }),
      remoteElement: this.createRemoteAudio(),
    })
  }

  async hangup(): Promise<void> {
    try {
      await this.call?.hangup()
    } finally {
      this.releaseCallMedia()
    }
  }

  toggleMute(): void {
    if (this.call === null) return
    if (this.call.isAudioMuted === true) this.call.unmuteAudio()
    else this.call.muteAudio()
  }

  async toggleHold(): Promise<void> {
    if (this.call === null) return
    if (this.call.state === 'held') await this.call.unhold()
    else await this.call.hold()
  }

  sendDtmf(digit: string): void {
    this.call?.dtmf(digit)
  }

  async disconnect(): Promise<void> {
    this.releaseCallMedia()
    await this.client?.disconnect()
    this.client = null
  }

  private createRemoteAudio(): HTMLAudioElement {
    this.releaseRemoteAudio()
    const audio = document.createElement('audio')
    audio.autoplay = true
    audio.setAttribute('aria-hidden', 'true')
    audio.style.position = 'fixed'
    audio.style.width = '1px'
    audio.style.height = '1px'
    audio.style.opacity = '0'
    audio.style.pointerEvents = 'none'
    audio.addEventListener('loadedmetadata', () => {
      void audio.play().catch(() => false)
    })
    document.body.appendChild(audio)
    this.remoteElement = audio
    return audio
  }

  private releaseCallMedia(): void {
    this.localStream?.getTracks().forEach((track) => {
      track.stop()
    })
    this.localStream = null
    this.call = null
    this.releaseRemoteAudio()
  }

  private releaseRemoteAudio(): void {
    if (this.remoteElement === null) return
    this.remoteElement.pause()
    this.remoteElement.srcObject = null
    this.remoteElement.remove()
    this.remoteElement = null
  }
}

function waitForSdkReady(client: TelnyxClient): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => {
      reject(new Error('Voice connection did not become ready.'))
    }, 30_000)
    client.on('telnyx.ready', () => {
      window.clearTimeout(timer)
      resolve()
    })
    client.on('telnyx.error', (event) => {
      window.clearTimeout(timer)
      reject(event instanceof Error ? event : new Error('Voice connection failed.'))
    })
  })
}

function isCallEnded(state: string | undefined): boolean {
  return state !== undefined && ['hangup', 'destroy', 'purge'].includes(state)
}
