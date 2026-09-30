import type { WriteContext } from './context'
import type { DemoDataset } from './types'
import type { Workflows } from './write-base'
import { writeCampaigns, writeEmails, writeNotes, writeStageHistory } from './write-activity'

/** Everything that hangs off the records: history, notes, email threads and sent newsletters. */
export async function writeActivityAll(
  context: WriteContext,
  input: { readonly data: DemoDataset; readonly workflows: Workflows; readonly sender: string },
): Promise<void> {
  await writeStageHistory(context, input)
  await writeNotes(context, input.data)
  await writeEmails(context, input.data)
  await writeCampaigns(context, input)
}
