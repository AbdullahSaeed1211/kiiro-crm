import { NativeSelect } from '@ops/ui/components/ui/native-select'
import { TIMEZONE_VALUES } from '@ops/kernel'
import { TEMPLATE_KEYS, TEMPLATE_LABELS } from '@ops/templates'
import type { OnboardingCopy } from '../../../i18n/onboarding-copy'
import { CURRENCY_OPTIONS } from '../../../i18n/currencies'
import { SearchableSelect } from '../settings/searchable-select'

export interface WizardValues {
  readonly appName: string
  readonly timezone: string
  readonly currency: string
  readonly locale: string
  readonly template: string
}

interface StepProps {
  readonly copy: OnboardingCopy
  readonly values: WizardValues
  readonly update: (key: keyof WizardValues, value: string) => void
}

/** Step 1: name, time zone, currency and language of the workspace. */
export function WorkspaceStep({ copy, values, update }: StepProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <label className="grid gap-1 text-sm sm:col-span-2">
        {copy.workspaceName}
        <input
          className="h-9 border px-3"
          value={values.appName}
          onChange={(event) => {
            update('appName', event.target.value)
          }}
          required
        />
      </label>
      <label className="grid gap-1 text-sm">
        {copy.timeZone}
        <SearchableSelect
          id="workspace-timezone"
          label={copy.timeZone}
          options={TIMEZONE_VALUES.map((value) => ({ value, label: value }))}
          value={values.timezone}
          onChange={(value) => {
            update('timezone', value)
          }}
        />
      </label>
      <div className="grid gap-1 text-sm">
        <span>{copy.currency}</span>
        <SearchableSelect
          id="workspace-currency"
          label={copy.currency}
          options={CURRENCY_OPTIONS}
          value={values.currency}
          onChange={(value) => {
            update('currency', value)
          }}
        />
      </div>
      <label className="grid gap-1 text-sm">
        {copy.locale}
        <NativeSelect
          value={values.locale}
          onChange={(event) => {
            update('locale', event.target.value)
          }}
        >
          <option value="en">English</option>
          <option value="es">Español</option>
        </NativeSelect>
      </label>
    </div>
  )
}

/** Step 3: the starting preset for terminology, fields and pipelines. */
export function TemplateStep({ copy, values, update }: StepProps) {
  return (
    <div className="grid max-w-sm gap-2">
      <label className="grid gap-1 text-sm" htmlFor="business-type">
        {copy.businessType}
      </label>
      <p className="text-xs text-muted-foreground" id="business-type-help">
        {copy.businessTypeHelp}
      </p>
      <NativeSelect
        aria-describedby="business-type-help"
        id="business-type"
        value={values.template}
        onChange={(event) => {
          update('template', event.target.value)
        }}
      >
        {TEMPLATE_KEYS.map((value) => (
          <option key={value} value={value}>
            {TEMPLATE_LABELS[value]}
          </option>
        ))}
      </NativeSelect>
    </div>
  )
}

/** Steps 5 and 6: short pointers to the settings pages that do the work. */
export function PointerStep({ kind, copy }: Readonly<{ kind: 'intake' | 'import'; copy: OnboardingCopy }>) {
  const link = 'underline'
  if (kind === 'import')
    return (
      <p className="max-w-prose text-sm text-muted-foreground">
        {copy.importBefore}
        <a className={link} href="/settings/import">
          {copy.importLink}
        </a>
        {copy.importAfter}
      </p>
    )
  return (
    <p className="max-w-prose text-sm text-muted-foreground">
      {copy.intakeBefore}
      <a className={link} href="/settings/intake">
        {copy.intakeLink}
      </a>
      {copy.intakeMiddle}
      <a className={link} href="/settings/lists">
        {copy.listsLink}
      </a>
      .
    </p>
  )
}
