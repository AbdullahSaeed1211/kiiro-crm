/** An amount in integer minor units with its ISO 4217 currency code (decision D-10). */
export interface Money {
  readonly amountMinor: number
  readonly currency: string
}
