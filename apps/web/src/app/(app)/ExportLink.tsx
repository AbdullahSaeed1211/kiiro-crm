import { buttonVariants } from '@ops/ui/components/ui/button'
import { catalogFor } from '../../i18n/locale'
import { EXPORT_COPY } from '../../i18n/export-copy'
import { getProductContext } from '../../server/auth/context'
import { loadWorkspaceLocale } from '../../server/queries/work/read-models'

/** Download link for a list's CSV, shown to owners and managers only (the same people the export allows). */
export async function ExportLink({ kind }: Readonly<{ kind: 'leads' | 'deals' | 'contacts' | 'organizations' }>) {
  const { actor } = await getProductContext()
  if (actor.role !== 'owner' && actor.role !== 'manager') return null
  const copy = catalogFor(EXPORT_COPY, await loadWorkspaceLocale())
  return (
    <a className={buttonVariants({ variant: 'outline' })} href={`/api/v1/export/${kind}`} download title={copy.hint}>
      {copy.link}
    </a>
  )
}
