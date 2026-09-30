import { isManagerUp } from '@ops/platform'
import { getRequestContext } from '@/server/container'
import { ArchiveRecordButton } from './archive-record-button'

/** The Archive button for owners and managers; everyone else sees nothing. */
export async function ArchiveRecordControl(props: Readonly<Parameters<typeof ArchiveRecordButton>[0]>) {
  const { actor } = await getRequestContext()
  return isManagerUp(actor) ? <ArchiveRecordButton {...props} /> : null
}
