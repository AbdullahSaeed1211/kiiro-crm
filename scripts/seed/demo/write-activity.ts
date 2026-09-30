import { COLLECTIONS, at, createDoc, idFor, type WriteContext } from './context'
import { need } from './need'
import type { DemoDataset, StageStep } from './types'
import type { WorkflowInfo, Workflows } from './write-base'

const DAY_MS = 86_400_000

interface History {
  readonly recordType: 'lead' | 'deal'
  readonly recordId: string
  readonly workflow: WorkflowInfo
  readonly path: readonly StageStep[]
}

/** The stage change row and the matching activity entry for one step of a record's path. */
async function writeStep(
  context: WriteContext,
  input: { readonly history: History; readonly from: StageStep; readonly to: StageStep },
): Promise<void> {
  const { history, from, to } = input
  const fromStage = need(history.workflow.stages.get(from.stage), `stage ${from.stage}`)
  const toStage = need(history.workflow.stages.get(to.stage), `stage ${to.stage}`)
  const { recordType, recordId } = history
  await createDoc(context, {
    collection: COLLECTIONS.stageTransitions,
    data: {
      recordType,
      recordId,
      workflow: history.workflow.id,
      fromStageId: fromStage.id,
      toStageId: toStage.id,
      fromCategory: fromStage.category,
      toCategory: toStage.category,
      changedBy: context.owner.id,
      changedAt: at(context, to.day),
      durationMs: Math.max(0, (to.day - from.day) * DAY_MS),
    },
  })
  await createDoc(context, {
    collection: COLLECTIONS.activity,
    data: {
      recordType,
      recordId,
      verb: 'stage.changed',
      actor: context.owner.id,
      data: { from: from.stage, to: to.stage },
      occurredAt: at(context, to.day),
    },
  })
}

/** A created entry, then one stage change per step after the first. */
async function writeHistory(context: WriteContext, history: History): Promise<void> {
  const first = need(history.path[0], 'a stage path')
  await createDoc(context, {
    collection: COLLECTIONS.activity,
    data: {
      recordType: history.recordType,
      recordId: history.recordId,
      verb: 'record.created',
      actor: context.owner.id,
      data: {},
      occurredAt: at(context, first.day),
    },
  })
  for (const [index, to] of history.path.entries()) {
    if (index > 0) await writeStep(context, { history, from: need(history.path[index - 1], 'the previous step'), to })
  }
}

export async function writeStageHistory(
  context: WriteContext,
  input: { readonly data: DemoDataset; readonly workflows: Workflows },
): Promise<void> {
  for (const lead of input.data.leads) {
    await writeHistory(context, {
      recordType: 'lead',
      recordId: idFor(context, lead.key),
      workflow: input.workflows.lead,
      path: lead.path,
    })
  }
  for (const deal of input.data.deals) {
    await writeHistory(context, {
      recordType: 'deal',
      recordId: idFor(context, deal.key),
      workflow: input.workflows.deal,
      path: deal.path,
    })
  }
}

/** Notes are comments, so each runs as the user who wrote it. */
export async function writeNotes(context: WriteContext, data: DemoDataset): Promise<void> {
  for (const note of data.notes) {
    await createDoc(context, {
      collection: 'comments',
      day: note.day,
      user: context.users.get(note.authorKey),
      data: {
        recordType: note.recordType,
        recordId: idFor(context, note.recordKey),
        author: idFor(context, note.authorKey),
        body: note.body,
      },
    })
  }
}

export async function writeEmails(context: WriteContext, data: DemoDataset): Promise<void> {
  for (const email of data.emails) {
    await createDoc(context, {
      collection: COLLECTIONS.emailMessages,
      data: {
        direction: email.direction,
        recordType: email.recordType,
        recordId: idFor(context, email.recordKey),
        messageId: email.id,
        from: email.fromAddress,
        to: [email.toAddress],
        cc: [],
        subject: email.subject,
        textBody: email.body,
        attachments: [],
        status: email.direction === 'outbound' ? 'sent' : 'received',
        occurredAt: at(context, email.day),
      },
    })
  }
}

/** Past newsletters appear in the campaign list through their per-contact email rows. */
export async function writeCampaigns(
  context: WriteContext,
  input: { readonly data: DemoDataset; readonly sender: string },
): Promise<void> {
  const byKey = new Map(input.data.contacts.map((contact) => [contact.key, contact]))
  for (const campaign of input.data.campaigns) {
    for (const contactKey of campaign.contactKeys) {
      const recordId = idFor(context, contactKey)
      await createDoc(context, {
        collection: COLLECTIONS.emailMessages,
        data: {
          direction: 'outbound',
          recordType: 'contact',
          recordId,
          messageId: `newsletter:${campaign.id}:${recordId}`,
          from: input.sender,
          to: [need(byKey.get(contactKey), `contact ${contactKey}`).email],
          cc: [],
          subject: campaign.subject,
          textBody: campaign.body,
          attachments: [],
          status: 'sent',
          occurredAt: at(context, campaign.day),
        },
      })
    }
  }
}
