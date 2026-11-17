'use client'

import type { VoiceOffer } from '@ops/module-crm'
import { Button } from '@ops/ui/components/ui/button'
import { Input } from '@ops/ui/components/ui/input'
import { Phone, Search } from 'lucide-react'
import type { CallingCopy } from '../../../../i18n/calling-copy'
import { hasQuote, price } from './calling-settings-utils'
type Copy = CallingCopy

export function NumberSearch({
  areaCode,
  offers,
  copy,
  busy,
  searchAvailable,
  onAreaCodeChange,
  onSearch,
  onBuy,
}: Readonly<{
  areaCode: string
  offers: readonly VoiceOffer[]
  copy: Copy
  busy: boolean
  searchAvailable: boolean
  onAreaCodeChange: (value: string) => void
  onSearch: () => void
  onBuy: (offer: VoiceOffer) => void
}>) {
  return (
    <section className="space-y-4 border-t pt-6">
      <div className="flex items-center gap-2">
        <Phone aria-hidden className="size-4" />
        <h2 className="font-medium">{copy.numbers}</h2>
      </div>
      <form
        className="flex flex-wrap gap-2"
        onSubmit={(event) => {
          event.preventDefault()
          onSearch()
        }}
      >
        <label className="grid gap-1 text-sm">
          <span>{copy.areaCode}</span>
          <Input
            className="w-32"
            inputMode="numeric"
            autoComplete="postal-code"
            maxLength={3}
            pattern="[0-9]{3}"
            value={areaCode}
            onChange={(event) => {
              onAreaCodeChange(event.target.value.replace(/\D/g, '').slice(0, 3))
            }}
          />
        </label>
        <Button
          type="submit"
          variant="outline"
          className="mt-auto"
          disabled={busy || !searchAvailable || areaCode.length !== 3}
        >
          <Search aria-hidden />
          {copy.search}
        </Button>
      </form>
      <p className="text-xs text-muted-foreground">{copy.quote}</p>
      <OfferList offers={offers} copy={copy} onBuy={onBuy} />
    </section>
  )
}

function OfferList({
  offers,
  copy,
  onBuy,
}: Readonly<{ offers: readonly VoiceOffer[]; copy: Copy; onBuy: (offer: VoiceOffer) => void }>) {
  if (offers.length === 0) return null
  return (
    <div className="space-y-2 rounded-lg border p-3">
      {offers.map((offer) => (
        <div
          key={offer.token}
          className="flex flex-wrap items-center justify-between gap-3 border-b pb-2 last:border-0 last:pb-0"
        >
          <OfferDetails offer={offer} copy={copy} />
          <Button
            size="sm"
            variant="outline"
            disabled={!hasQuote(offer)}
            onClick={() => {
              onBuy(offer)
            }}
          >
            {copy.buy}
          </Button>
        </div>
      ))}
    </div>
  )
}

function OfferDetails({ offer, copy }: Readonly<{ offer: VoiceOffer; copy: Copy }>) {
  return (
    <div>
      <p className="font-medium">
        {offer.e164} <span className="text-xs font-normal text-muted-foreground">{offer.region}</span>
      </p>
      <p className="text-xs text-muted-foreground">
        {copy.monthly}: {price(offer.monthlyCost)} · {copy.setup}: {price(offer.setupCost)}
      </p>
    </div>
  )
}
