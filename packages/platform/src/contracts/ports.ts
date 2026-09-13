import type { Id, Result } from '@ops/kernel'
import type { RecordRef, StageTrackedRecord } from './records'
import type { StageTransition, Workflow } from './workflows'

/** Runs writes as one unit: a database transaction when supported, otherwise ordered idempotent writes (D-36). */
export interface UnitOfWork {
  run<T>(work: () => Promise<T>): Promise<T>
}

/** Persistence needed by `changeStage`. */
export interface StageStore {
  loadRecord(ref: RecordRef): Promise<StageTrackedRecord | undefined>
  loadWorkflow(id: Id): Promise<Workflow | undefined>
  saveStage(input: {
    readonly ref: RecordRef
    readonly stageId: Id
    readonly stageEnteredAt: number
  }): Promise<StageTrackedRecord>
  addTransition(transition: StageTransition): Promise<void>
  addActivity(entry: {
    readonly record: RecordRef
    readonly verb: string
    readonly actorId: Id
    readonly data: Readonly<Record<string, unknown>>
    readonly occurredAt: number
  }): Promise<void>
}

/** An outbound message; every notification email has exactly one recipient. */
export interface MailMessage {
  readonly from: string
  readonly to: readonly string[]
  readonly subject: string
  readonly html: string
  readonly text: string
  readonly replyTo?: string
  readonly headers?: Readonly<Record<string, string>>
}

/** Outbound email port implemented by Cloudflare Email Service, Resend or the console. */
export interface MailSender {
  send(message: MailMessage): Promise<Result<{ readonly messageId: string }>>
}
