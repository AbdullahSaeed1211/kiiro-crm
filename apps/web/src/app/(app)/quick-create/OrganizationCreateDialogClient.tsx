'use client'

import { catalogFor } from '../../../i18n/locale'
import { useLocale } from '../../../i18n/locale-context'
import { QUICK_CREATE_COPY } from '../../../i18n/quick-create-copy'
import { quickCreateOrganization } from '../../../server/actions/crm/quick-create'
import { QuickCreateDialog } from './QuickCreateDialog'

export function OrganizationCreateDialogClient() {
  const copy = catalogFor(QUICK_CREATE_COPY, useLocale())
  return (
    <QuickCreateDialog
      basePath="/organizations"
      submit={quickCreateOrganization}
      text={{
        title: copy.organizationTitle,
        description: copy.organizationDescription,
        create: copy.organizationCreate,
        creating: copy.organizationCreating,
        cancel: copy.cancel,
        moreFields: copy.moreFields,
      }}
      fields={[
        {
          id: 'org-name',
          name: 'name',
          label: copy.organizationFieldName,
          placeholder: 'e.g. Acme Inc.',
          maxLength: 300,
          required: true,
        },
        {
          id: 'org-website',
          name: 'website',
          label: copy.organizationFieldWebsite,
          placeholder: 'https://acme.test',
          maxLength: 10000,
        },
        {
          id: 'org-email',
          name: 'email',
          label: copy.organizationFieldEmail,
          placeholder: 'contact@acme.test',
          type: 'email',
        },
        {
          id: 'org-phone',
          name: 'phone',
          label: copy.organizationFieldPhone,
          placeholder: '+1 555 000 0000',
          type: 'tel',
        },
      ]}
    />
  )
}
