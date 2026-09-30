'use client'

import { CustomFieldsCard, type CustomFieldValue } from '@ops/ui/composites/CustomFields'
import { useRouter } from 'next/navigation'
import { recordDetailsLabels } from '../../i18n/record-details-copy'
import { saveRecordDetails } from '../../server/actions/crm/record-details'
import type { RecordDetailsView } from '../../server/queries/crm/record-details'

/** Saves the card through the server action and refreshes the record page on success. */
export function RecordDetailsPanel({
  type,
  id,
  view,
  locale,
}: Readonly<{
  type: 'organization' | 'contact' | 'lead'
  id: string
  view: RecordDetailsView
  locale: string
}>) {
  const router = useRouter()
  return (
    <CustomFieldsCard
      fields={view.fields}
      values={view.values}
      canEdit={view.canEdit}
      locale={locale}
      labels={recordDetailsLabels(locale)}
      onSave={async (values: Readonly<Record<string, CustomFieldValue>>) => {
        const result = await saveRecordDetails({ type, id, expectedUpdatedAt: view.updatedAt, values })
        if (result.ok) router.refresh()
        return result
      }}
    />
  )
}
