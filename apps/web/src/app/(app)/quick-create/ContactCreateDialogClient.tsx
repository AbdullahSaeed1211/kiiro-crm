'use client'

import { QUICK_CREATE_COPY } from '../../../i18n/quick-create-copy'
import { quickCreateContact } from '../../../server/actions/crm/quick-create'
import { QuickCreateDialog } from './QuickCreateDialog'

const copy = QUICK_CREATE_COPY.en

export function ContactCreateDialogClient() {
  return (
    <QuickCreateDialog
      basePath="/contacts"
      submit={quickCreateContact}
      text={{
        title: copy.contactTitle,
        description: copy.contactDescription,
        create: copy.contactCreate,
        creating: copy.contactCreating,
        cancel: copy.cancel,
        moreFields: copy.moreFields,
      }}
      fields={[
        {
          id: 'contact-first-name',
          name: 'firstName',
          label: copy.contactFieldFirstName,
          placeholder: 'Jane',
          maxLength: 200,
          required: true,
        },
        {
          id: 'contact-last-name',
          name: 'lastName',
          label: copy.contactFieldLastName,
          placeholder: 'Doe',
          maxLength: 10000,
        },
        {
          id: 'contact-email',
          name: 'email',
          label: copy.contactFieldEmail,
          placeholder: 'jane@acme.test',
          type: 'email',
        },
        {
          id: 'contact-phone',
          name: 'phone',
          label: copy.contactFieldPhone,
          placeholder: '+1 555 000 0000',
          type: 'tel',
        },
      ]}
    />
  )
}
