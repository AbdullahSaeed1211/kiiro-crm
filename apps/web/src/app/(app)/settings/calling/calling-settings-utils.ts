import type { VoiceNumber, VoiceOffer } from '@ops/module-crm'
import type { CallingCopy } from '../../../../i18n/calling-copy'

export function statusLabel(number: VoiceNumber, copy: CallingCopy): string {
  if (number.status === 'pending') return copy.pending
  if (number.status === 'failed') return copy.failed
  if (number.status === 'active') return copy.active
  return copy.paused
}

export function updateAssignmentIds({
  current,
  memberId,
  operation,
}: Readonly<{ current: string[]; memberId: string; operation: 'add' | 'remove' }>): string[] {
  return operation === 'add' ? [...new Set([...current, memberId])] : current.filter((id) => id !== memberId)
}

export function price(value: string | null): string {
  if (value === null || value.trim() === '') return '—'
  const amount = Number(value)
  return Number.isFinite(amount) && amount >= 0
    ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)
    : '—'
}

export function hasQuote(offer: VoiceOffer): boolean {
  return [offer.monthlyCost, offer.setupCost].every((value) => {
    if (value.trim() === '') return false
    const amount = Number(value)
    return Number.isFinite(amount) && amount >= 0
  })
}
