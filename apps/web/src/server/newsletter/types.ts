/** A contact who opted in to the newsletter. */
export interface Subscriber {
  readonly id: string
  readonly email: string
  readonly name: string
  /** The audiences the contact belongs to; empty when they are only on the general list. */
  readonly audiences: readonly string[]
}

/** The subject and plain-text body of one campaign. */
export interface CampaignMessage {
  readonly subject: string
  readonly body: string
}
