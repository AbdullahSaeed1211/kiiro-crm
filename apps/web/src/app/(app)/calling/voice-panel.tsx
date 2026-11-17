'use client'

import { Button } from '@ops/ui/components/ui/button'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@ops/ui/components/ui/sheet'
import { X } from 'lucide-react'
import { useLocale } from '../../../i18n/locale-context'
import { CALLING_COPY } from '../../../i18n/calling-copy'
import type { CallingCopy } from '../../../i18n/calling-copy'
import type { VoiceSnapshot } from '@ops/module-crm'
import { useVoice } from './voice-context-state'
import { PanelStatus } from './voice-panel-status'
import { CallingPanelContent } from './voice-panel-content'
import { useCallingPanelActions } from './use-calling-panel'

function description(snapshot: VoiceSnapshot | null, copy: CallingCopy): string {
  if (snapshot === null) return copy.connecting
  if (snapshot.mode === 'simulator') return copy.simulator
  if (snapshot.configured) return copy.live
  return copy.setupRequired
}

export function CallingPanel() {
  const locale = useLocale()
  const copy = CALLING_COPY[locale]
  const voice = useVoice()
  const actions = useCallingPanelActions(voice, copy)
  const hold = () => {
    void voice.toggleHold().catch(actions.showError)
  }
  return (
    <Sheet open={voice.isOpen && !voice.minimized} onOpenChange={voice.minimize}>
      <SheetContent
        side="bottom"
        showCloseButton={false}
        className="mx-auto max-h-[min(90svh,48rem)] w-full max-w-[390px] gap-0 overflow-hidden rounded-t-2xl border p-0 data-[side=bottom]:sm:inset-x-auto data-[side=bottom]:sm:bottom-4 data-[side=bottom]:sm:left-auto data-[side=bottom]:sm:right-4 data-[side=bottom]:sm:mx-0 data-[side=bottom]:sm:h-[min(720px,calc(100svh-2rem))] data-[side=bottom]:sm:max-h-[calc(100svh-2rem)] data-[side=bottom]:sm:max-w-[390px] data-[side=bottom]:sm:rounded-xl data-[side=bottom]:sm:border"
      >
        <SheetHeader className="flex-row items-start justify-between border-b px-4 py-3">
          <div>
            <SheetTitle>{copy.title}</SheetTitle>
            <SheetDescription>{description(voice.snapshot, copy)}</SheetDescription>
          </div>
          <Button variant="ghost" size="icon-sm" aria-label={copy.close} onClick={voice.minimize}>
            <X aria-hidden />
          </Button>
        </SheetHeader>
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-4">
          <PanelStatus
            snapshot={voice.snapshot}
            copy={copy}
            receiving={voice.receivingCalls}
            pending={actions.pending}
            activeCall={voice.activeCall !== null}
            onToggle={actions.toggleReceiving}
          />
          <CallingPanelContent
            snapshot={voice.snapshot}
            activeCall={voice.activeCall}
            wrapupCall={actions.wrapupCall}
            draft={voice.acceptDraft()}
            locale={locale}
            copy={copy}
            pending={actions.pending}
            now={actions.now}
            tabAvailable={voice.tabAvailable}
            onCall={actions.placeCall}
            onAnswer={actions.answer}
            onDecline={actions.decline}
            onHangup={actions.hangup}
            onMute={voice.toggleMute}
            onHold={hold}
            onDtmf={voice.sendDtmf}
            onSaveWrapup={actions.saveWrapup}
          />
          {voice.error !== null ? (
            <p role="alert" className="mt-3 text-sm text-destructive">
              {voice.error}
            </p>
          ) : null}
          {voice.snapshot?.mode === 'telnyx' ? (
            <p className="mt-auto pt-4 text-xs text-muted-foreground">{copy.notAvailableMobile}</p>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  )
}
