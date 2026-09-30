'use client'

import { QUICK_CREATE_COPY } from '../../../i18n/quick-create-copy'
import { quickCreateLead } from '../../../server/actions/crm/quick-create'
import { QuickCreateDialog } from './QuickCreateDialog'

const copy = QUICK_CREATE_COPY.en

export function LeadCreateDialogClient() {
  return (
    <QuickCreateDialog
      basePath="/leads"
      submit={quickCreateLead}
      text={{
        title: copy.leadTitle,
        description: copy.leadDescription,
        create: copy.leadCreate,
        creating: copy.leadCreating,
        cancel: copy.cancel,
        moreFields: copy.moreFields,
      }}
      fields={[
        {
          id: 'lead-title',
          name: 'title',
          label: copy.leadFieldTitle,
          placeholder: 'Website redesign',
          maxLength: 300,
        },
        {
          id: 'lead-first-name',
          name: 'firstName',
          label: copy.leadFieldFirstName,
          placeholder: 'Jane',
          maxLength: 200,
        },
        { id: 'lead-email', name: 'email', label: copy.leadFieldEmail, placeholder: 'jane@acme.test', type: 'email' },
        { id: 'lead-phone', name: 'phone', label: copy.leadFieldPhone, placeholder: '+1 555 000 0000', type: 'tel' },
        {
          id: 'lead-company',
          name: 'companyName',
          label: copy.leadFieldCompany,
          placeholder: 'Acme Inc.',
          maxLength: 10000,
        },
      ]}
    />
  )
}
