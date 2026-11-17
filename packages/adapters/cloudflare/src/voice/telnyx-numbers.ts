import type { VoiceOffer } from '@ops/module-crm'
import type { VoiceProvider } from '@ops/module-crm'
import { costValue } from './telnyx-utils'
import { TelnyxApi, type TelnyxData } from './telnyx-api'

interface TelnyxPhoneNumber {
  readonly id?: string
  readonly phone_number?: string
  readonly status?: string
  readonly connection_id?: string
  readonly cost_information?: { readonly monthly_cost?: string; readonly upfront_cost?: string }
}

interface TelnyxNumberOrder {
  readonly id?: string
  readonly status?: string
  readonly phone_numbers?: readonly TelnyxPhoneNumber[]
}

/** Telnyx US number search, order, and lifecycle operations. */
export class TelnyxNumberProvider
  extends TelnyxApi
  implements Pick<VoiceProvider, 'searchNumbers' | 'purchaseNumber' | 'verifyNumber' | 'releaseNumber'>
{
  async searchNumbers(input: { readonly areaCode: string }): Promise<readonly VoiceOffer[]> {
    const query = new URLSearchParams({
      'filter[country_code]': 'US',
      'filter[phone_number_type]': 'local',
      'filter[national_destination_code]': input.areaCode,
      'filter[limit]': '20',
    })
    const response = await this.request<TelnyxData<readonly TelnyxPhoneNumber[]>>(
      `/available_phone_numbers?${query.toString()}`,
    )
    const records = response.data ?? []
    return records.flatMap((record) => {
      const e164 = record.phone_number
      const monthlyCost = costValue(record.cost_information?.monthly_cost)
      const setupCost = costValue(record.cost_information?.upfront_cost)
      if (
        typeof e164 !== 'string' ||
        !/^\+1[2-9]\d{9}$/u.test(e164) ||
        monthlyCost === undefined ||
        setupCost === undefined
      )
        return []
      return [
        {
          token: '',
          e164,
          region: input.areaCode,
          monthlyCost,
          setupCost,
          expiresAt: Date.now() + 5 * 60_000,
        },
      ]
    })
  }

  async purchaseNumber(input: { readonly offer: VoiceOffer; readonly requestKey: string }): Promise<{
    readonly status: 'active' | 'pending'
    readonly e164: string
    readonly providerNumberId: string
    readonly orderId: string
    readonly monthlyCost: string
    readonly setupCost: string
  }> {
    const order = await this.createOrder(input)
    const confirmed = confirmedOrderNumber(order)
    const status = await this.verifyNumber({ providerNumberId: confirmed.number.id, orderId: confirmed.orderId })
    if (status === 'failed') throw new Error('Telnyx rejected the number order')
    return purchaseResult({ offer: input.offer, orderId: confirmed.orderId, number: confirmed.number, status })
  }

  private async createOrder(input: {
    readonly offer: VoiceOffer
    readonly requestKey: string
  }): Promise<TelnyxNumberOrder | undefined> {
    const response = await this.request<TelnyxData<TelnyxNumberOrder>>('/number_orders', {
      method: 'POST',
      headers: { 'idempotency-key': input.requestKey },
      body: JSON.stringify({
        phone_numbers: [{ phone_number: input.offer.e164 }],
        connection_id: this.config.callControlApplicationId,
      }),
    })
    return response.data
  }

  async verifyNumber(input: {
    readonly providerNumberId: string
    readonly orderId: string
  }): Promise<'active' | 'pending' | 'failed'> {
    const [orderResponse, numberResponse] = await Promise.all([
      this.request<TelnyxData<TelnyxNumberOrder>>(`/number_orders/${encodeURIComponent(input.orderId)}`),
      this.request<TelnyxData<TelnyxPhoneNumber>>(`/phone_numbers/${encodeURIComponent(input.providerNumberId)}`),
    ])
    return numberOrderState(orderResponse.data?.status, numberResponse.data, this.config.callControlApplicationId)
  }

  async releaseNumber(input: { readonly providerNumberId: string; readonly requestKey: string }): Promise<void> {
    await this.request(`/phone_numbers/${encodeURIComponent(input.providerNumberId)}`, {
      method: 'DELETE',
      headers: { 'idempotency-key': input.requestKey },
    })
  }
}

function confirmedOrderNumber(order: TelnyxNumberOrder | undefined): {
  readonly orderId: string
  readonly number: TelnyxPhoneNumber & { id: string; phone_number: string }
} {
  const number = order?.phone_numbers?.[0]
  if (order?.id === undefined || number?.id === undefined || number.phone_number === undefined)
    throw new Error('Telnyx has not confirmed the number order')
  return { orderId: order.id, number: { ...number, id: number.id, phone_number: number.phone_number } }
}

function purchaseResult({
  offer,
  orderId,
  number,
  status,
}: {
  offer: VoiceOffer
  orderId: string
  number: TelnyxPhoneNumber & { id: string; phone_number: string }
  status: 'active' | 'pending'
}) {
  return {
    status,
    e164: number.phone_number,
    providerNumberId: number.id,
    orderId,
    monthlyCost: number.cost_information?.monthly_cost ?? offer.monthlyCost,
    setupCost: number.cost_information?.upfront_cost ?? offer.setupCost,
  }
}

function numberOrderState(
  orderStatus: string | undefined,
  number: TelnyxPhoneNumber | undefined,
  applicationId: string,
): 'active' | 'pending' | 'failed' {
  const normalizedOrder = orderStatus?.toLowerCase()
  const normalizedNumber = number?.status?.toLowerCase()
  const failed = isFailedOrder(normalizedOrder, normalizedNumber)
  const active = isActiveNumber({
    order: normalizedOrder,
    status: normalizedNumber,
    connectionId: number?.connection_id,
    expected: applicationId,
  })
  if (failed) return 'failed'
  return active ? 'active' : 'pending'
}

function isFailedOrder(order: string | undefined, number: string | undefined): boolean {
  return order === 'failed' || order === 'failure' || number === 'failed'
}

function isActiveNumber(input: {
  order: string | undefined
  status: string | undefined
  connectionId: string | undefined
  expected: string
}): boolean {
  return input.order === 'success' && input.status === 'active' && input.connectionId === input.expected
}
