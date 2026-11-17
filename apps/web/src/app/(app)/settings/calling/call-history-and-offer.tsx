'use client'

import type { VoiceOffer, VoiceSnapshot } from '@ops/module-crm'
import { Button } from '@ops/ui/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@ops/ui/components/ui/dialog'
import type { CallingCopy } from '../../../../i18n/calling-copy'
import { hasQuote, price } from './calling-settings-utils'
type Copy = CallingCopy

export function TeamCallHistory({
  snapshot,
  locale,
  copy,
}: Readonly<{ snapshot: VoiceSnapshot; locale: string; copy: Copy }>) {
  if (snapshot.calls.length === 0) return null
  return (
    <section className="space-y-3 border-t pt-6">
      <h2 className="font-medium">{copy.teamHistory}</h2>
      <div className="divide-y rounded-lg border">
        {snapshot.calls.slice(0, 12).map((call) => (
          <div key={call.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm">
            <span className="min-w-0 truncate">{call.direction === 'inbound' ? call.from : call.to}</span>
            <span className="text-xs text-muted-foreground">
              {new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(call.createdAt)}
            </span>
            {call.recordingState === 'ready' ? (
              <a
                className="text-xs underline underline-offset-2"
                href={`/api/v1/voice/calls/${encodeURIComponent(call.id)}/recording`}
              >
                {copy.playRecording}
              </a>
            ) : null}
          </div>
        ))}
      </div>
    </section>
  )
}

export function OfferDialog({
  offer,
  copy,
  busy,
  onClose,
  onBuy,
}: Readonly<{
  offer: VoiceOffer | null
  copy: Copy
  busy: boolean
  onClose: () => void
  onBuy: (offer: VoiceOffer) => void
}>) {
  return (
    <Dialog
      open={offer !== null}
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {copy.confirmBuy} {offer?.e164}
          </DialogTitle>
          <DialogDescription>{copy.quote}</DialogDescription>
        </DialogHeader>
        {offer === null ? null : (
          <dl className="grid grid-cols-2 gap-2 rounded-lg bg-muted/40 p-3 text-sm">
            <dt>{copy.monthly}</dt>
            <dd className="text-right font-medium">{price(offer.monthlyCost)}</dd>
            <dt>{copy.setup}</dt>
            <dd className="text-right font-medium">{price(offer.setupCost)}</dd>
          </dl>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {copy.close}
          </Button>
          <Button
            disabled={busy || offer === null || !hasQuote(offer)}
            onClick={() => {
              if (offer !== null && hasQuote(offer)) onBuy(offer)
            }}
          >
            {copy.confirmBuy}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
