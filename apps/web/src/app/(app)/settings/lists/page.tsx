import type { Metadata } from 'next'
import { getProductContext } from '../../../../server/auth/context'
import { SettingsForm, SettingsPage } from '../settings-shell'
import { ListEditor, type ListItem } from './list-editor'

export const metadata: Metadata = { title: 'Lists' }
export const dynamic = 'force-dynamic'

async function names(collection: 'sources' | 'lostReasons'): Promise<ListItem[]> {
  const { payload, req } = await getProductContext()
  const found = await payload.find({
    collection,
    sort: 'name',
    limit: 100,
    depth: 0,
    overrideAccess: false,
    req,
  })
  return found.docs.map((doc) => ({ id: doc.id, name: doc.name }))
}

export default async function ListsSettingsPage() {
  const [sources, lostReasons] = await Promise.all([names('sources'), names('lostReasons')])
  return (
    <SettingsPage
      title="Lists"
      description="The choices people pick from when working leads and deals."
      roles={['owner', 'manager']}
    >
      <SettingsForm>
        <ListEditor
          kind="source"
          title="Lead sources"
          help="Where leads come from. Used on every lead, in assignment rules and in the Where leads come from chart."
          items={sources}
        />
      </SettingsForm>
      <SettingsForm>
        <ListEditor
          kind="lostReason"
          title="Lost reasons"
          help="Why a lead or deal was lost. A reason is required when marking one lost."
          items={lostReasons}
        />
      </SettingsForm>
    </SettingsPage>
  )
}
