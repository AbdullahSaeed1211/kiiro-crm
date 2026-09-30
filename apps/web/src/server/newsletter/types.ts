/** A contact who opted in to the newsletter. */
export interface Subscriber {
  readonly id: string
  readonly email: string
  readonly name: string
}

/** The subject and plain-text body of one campaign. */
export interface CampaignMessage {
  readonly subject: string
  readonly body: string
}
