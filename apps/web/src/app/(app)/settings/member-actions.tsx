'use client'

import { useState } from 'react'
import { NativeSelect } from '@ops/ui/components/ui/native-select'
import { CheckboxGroup } from './checkbox-group'
import { describeClientError } from '../client-errors'
import type { MemberAction } from './form-utils'
import { Button } from '@ops/ui/components/ui/button'
import { settingText } from '../../../i18n/settings-form-copy'
import { useLocale } from '../../../i18n/locale-context'

function ReportsToSelect({
  value,
  options,
  pending,
  onChange,
}: Readonly<{
  value: string
  options: readonly { id: string; name: string }[]
  pending: boolean
  onChange: (value: string) => void
}>) {
  const locale = useLocale()
  return (
    <label className="grid gap-1">
      <span className="font-medium">{settingText('Reports to', locale)}</span>
      <NativeSelect
        value={value}
        onChange={(event) => {
          onChange(event.target.value)
        }}
        disabled={pending}
      >
        <option value="">{settingText('No manager', locale)}</option>
        {options.map((report) => (
          <option key={report.id} value={report.id}>
            {report.name}
          </option>
        ))}
      </NativeSelect>
    </label>
  )
}

function SaveAccessButton({ pending, onSave }: Readonly<{ pending: boolean; onSave: () => void }>) {
  const locale = useLocale()
  return (
    <Button
      size="lg"
      type="button"
      onClick={() => {
        onSave()
      }}
      disabled={pending}
    >
      {pending ? settingText('Saving…', locale) : settingText('Save access', locale)}
    </Button>
  )
}

function MemberAccessForm({
  role,
  active,
  selectedGroups,
  reportsTo,
  groups,
  reports,
  pending,
  message,
  onRoleChange,
  onActiveChange,
  onGroupsChange,
  onReportsToChange,
  onSave,
}: Readonly<{
  role: string
  active: boolean
  selectedGroups: string[]
  reportsTo: string
  groups: readonly { id: string; name: string }[]
  reports: readonly { id: string; name: string }[]
  pending: boolean
  message: string | undefined
  onRoleChange: (value: string) => void
  onActiveChange: (checked: boolean) => void
  onGroupsChange: (values: string[]) => void
  onReportsToChange: (value: string) => void
  onSave: () => void
}>) {
  const locale = useLocale()
  return (
    <div className="mt-3 grid gap-3 rounded-md border bg-muted/20 p-3 text-xs">
      <label className="grid gap-1">
        <span className="font-medium">{settingText('Role', locale)}</span>
        <NativeSelect
          value={role}
          onChange={(event) => {
            onRoleChange(event.target.value)
          }}
          disabled={pending}
        >
          <option value="staff">{settingText('Staff', locale)}</option>
          <option value="manager">{settingText('Manager', locale)}</option>
          <option value="owner">{settingText('Owner', locale)}</option>
        </NativeSelect>
      </label>
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={active}
          onChange={(event) => {
            onActiveChange(event.target.checked)
          }}
          disabled={pending}
        />
        <span className="font-medium">{settingText('Account active', locale)}</span>
      </label>
      <CheckboxGroup
        label={settingText('Groups', locale)}
        options={groups}
        values={selectedGroups}
        disabled={pending}
        emptyText={settingText('No groups created yet', locale)}
        onChange={onGroupsChange}
      />
      <ReportsToSelect value={reportsTo} options={reports} pending={pending} onChange={onReportsToChange} />
      {message === undefined ? null : (
        <span className="text-muted-foreground" role="status" aria-live="polite">
          {message}
        </span>
      )}
      <SaveAccessButton pending={pending} onSave={onSave} />
    </div>
  )
}

export function MemberActions({
  member,
  groups,
  reports,
  action,
}: Readonly<{
  member: { id: string; role: string; active: boolean; groups: readonly string[]; reportsTo: string }
  groups: readonly { id: string; name: string }[]
  reports: readonly { id: string; name: string }[]
  action: MemberAction
}>) {
  const locale = useLocale()
  const [role, setRole] = useState(member.role)
  const [active, setActive] = useState(member.active)
  const [selectedGroups, setSelectedGroups] = useState<string[]>([...member.groups])
  const [reportsTo, setReportsTo] = useState(member.reportsTo)
  const [pending, setPending] = useState(false)
  const [message, setMessage] = useState<string>()

  const save = async () => {
    setPending(true)
    setMessage(undefined)
    try {
      const result = await action({ id: member.id, role, active, groups: selectedGroups, reportsTo })
      setMessage(result.ok ? settingText('Access saved.', locale) : settingText(result.error.message, locale))
    } catch (error) {
      setMessage(
        describeClientError(error, {
          context: 'member access save',
          fallback: settingText('Unable to save access. Try again.', locale),
        }),
      )
    } finally {
      setPending(false)
    }
  }

  return (
    <details className="max-w-sm">
      <summary className="cursor-pointer rounded-sm text-xs font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        {settingText('Edit access', locale)}
      </summary>
      <MemberAccessForm
        role={role}
        active={active}
        selectedGroups={selectedGroups}
        reportsTo={reportsTo}
        groups={groups}
        reports={reports}
        pending={pending}
        message={message === undefined ? undefined : settingText(message, locale)}
        onRoleChange={setRole}
        onActiveChange={setActive}
        onGroupsChange={setSelectedGroups}
        onReportsToChange={setReportsTo}
        onSave={() => {
          void save()
        }}
      />
    </details>
  )
}
