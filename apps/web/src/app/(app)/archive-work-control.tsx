import { isManagerUp } from '@ops/platform'
import { getRequestContext } from '@/server/container'
import { ArchiveWorkButton } from './archive-work-button'

/** The Archive button for a task or project, shown to owners and managers; everyone else sees nothing. */
export async function ArchiveWorkControl(props: Readonly<Parameters<typeof ArchiveWorkButton>[0]>) {
  const { actor } = await getRequestContext()
  return isManagerUp(actor) ? <ArchiveWorkButton {...props} /> : null
}
