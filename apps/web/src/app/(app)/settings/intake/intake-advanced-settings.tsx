'use client'

import type { ActionResult } from '../../../../server/actions/settings'
import { EmailAliasAndCredentialsSection } from './intake-form-server'
import { OriginsAndTurnstileSection } from './intake-form-basic'
import { RoutingDefaultsSection, SuccessBehaviorSection } from './intake-form-routing'
import type { createFieldUpdater, initializeValues } from './intake-form-helpers'
import type { IntakeFormView, IntakeOption } from './intake-types'

export function IntakeAdvancedSettings({
  form,
  values,
  updaters,
  users,
  sources,
  groups,
  keyResult,
  generatedKey,
  rotating,
  onGenerateKey,
}: Readonly<{
  form: IntakeFormView
  values: ReturnType<typeof initializeValues>
  updaters: ReturnType<typeof createFieldUpdater>
  users: readonly IntakeOption[]
  sources: readonly IntakeOption[]
  groups: readonly IntakeOption[]
  keyResult: ActionResult<{ serverKey: string }> | undefined
  generatedKey: string | undefined
  rotating: boolean
  onGenerateKey: () => void
}>) {
  return (
    <details className="border-t pt-4">
      <summary className="cursor-pointer text-sm font-medium">Advanced settings</summary>
      <div className="space-y-5 pt-4">
        <OriginsAndTurnstileSection
          allowedOrigins={values.allowedOrigins}
          requireTurnstile={values.requireTurnstile}
          onOriginsChange={updaters.updateAllowedOrigins}
          onTurnstileChange={updaters.updateRequireTurnstile}
        />
        <RoutingDefaultsSection
          users={users}
          sources={sources}
          groups={groups}
          defaultOwnerId={values.defaultOwnerId}
          defaultAssigneeIds={values.defaultAssigneeIds}
          defaultSourceId={values.defaultSourceId}
          notifyUserIds={values.notifyUserIds}
          notifyGroupIds={values.notifyGroupIds}
          onDefaultOwnerChange={updaters.updateDefaultOwnerId}
          onDefaultAssigneeChange={updaters.updateDefaultAssigneeIds}
          onDefaultSourceChange={updaters.updateDefaultSourceId}
          onNotifyUsersChange={updaters.updateNotifyUserIds}
          onNotifyGroupsChange={updaters.updateNotifyGroupIds}
        />
        <SuccessBehaviorSection
          successMessage={values.successMessage}
          redirectUrl={values.redirectUrl}
          onMessageChange={updaters.updateSuccessMessage}
          onRedirectChange={updaters.updateRedirectUrl}
        />
        <EmailAliasAndCredentialsSection
          form={form}
          emailAlias={values.emailAlias}
          generatedKey={generatedKey}
          keyResult={keyResult}
          rotating={rotating}
          onEmailAliasChange={updaters.updateEmailAlias}
          onGenerateKey={onGenerateKey}
        />
      </div>
    </details>
  )
}
