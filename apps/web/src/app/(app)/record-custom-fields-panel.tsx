'use client'

import { CustomFieldsCard, type CustomFieldValue } from '@ops/ui/composites/CustomFields'
import { useRouter } from 'next/navigation'
import { customFieldLabels } from '../../i18n/custom-field-copy'
import { saveCustomFields } from '../../server/actions/crm/custom-fields'
import type { CustomFieldsView } from '../../server/queries/crm/custom-fields'

/** Saves the card through the server action and refreshes the record page on success. */
export function RecordCustomFieldsPanel({
  type,
  id,
  view,
  locale,
}: Readonly<{
  type: 'organization' | 'contact' | 'lead' | 'deal'
  id: string
  view: CustomFieldsView
  locale: string
}>) {
  const router = useRouter()
  return (
    <CustomFieldsCard
      fields={view.fields}
      values={view.values}
      canEdit={view.canEdit}
      locale={locale}
      labels={customFieldLabels(locale)}
      onSave={async (values: Readonly<Record<string, CustomFieldValue>>) => {
        const result = await saveCustomFields({ type, id, expectedUpdatedAt: view.updatedAt, values })
        if (result.ok) router.refresh()
        return result
      }}
    />
  )
}
