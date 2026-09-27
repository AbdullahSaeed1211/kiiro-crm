export interface IntakeOption {
  readonly id: string
  readonly name: string
}

export interface IntakeSubmissionView {
  readonly id: string
  readonly channel: 'web' | 'server' | 'email'
  readonly status: 'accepted' | 'duplicate' | 'rejected_spam' | 'rejected_invalid'
  readonly receivedAt: number
}

export interface IntakeFormView {
  readonly id: string
  readonly name: string
  readonly key: string
  readonly active: boolean
  readonly allowedOrigins: readonly string[]
  readonly requireTurnstile: boolean
  readonly defaultOwnerId?: string
  readonly defaultAssigneeIds: readonly string[]
  readonly defaultSourceId?: string
  readonly notifyUserIds: readonly string[]
  readonly notifyGroupIds: readonly string[]
  readonly successMessage: string
  readonly redirectUrl: string
  readonly emailAlias: string
  readonly serverKeyCount: number
  readonly submissions: readonly IntakeSubmissionView[]
}
