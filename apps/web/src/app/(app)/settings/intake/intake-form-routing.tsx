'use client'

import { OptionSelect } from './intake-option-select'
import type { IntakeOption } from './intake-types'

const inputClass = 'h-10 rounded-md border bg-background px-3 text-sm'
/** OptionSelect reports a string for single selects and a string array for multiple ones. */
function single(onChange: (value: string) => void) {
  return (value: string | string[]) => {
    if (typeof value === 'string') onChange(value)
  }
}

function many(onChange: (value: string[]) => void) {
  return (value: string | string[]) => {
    onChange(Array.isArray(value) ? value : [value])
  }
}

const textAreaClass = 'min-h-24 rounded-md border bg-background px-3 py-2 text-sm'

export function RoutingDefaultsSection({
  users,
  sources,
  groups,
  defaultOwnerId,
  defaultAssigneeIds,
  defaultSourceId,
  notifyUserIds,
  notifyGroupIds,
  onDefaultOwnerChange,
  onDefaultAssigneeChange,
  onDefaultSourceChange,
  onNotifyUsersChange,
  onNotifyGroupsChange,
}: Readonly<{
  users: readonly IntakeOption[]
  sources: readonly IntakeOption[]
  groups: readonly IntakeOption[]
  defaultOwnerId: string
  defaultAssigneeIds: readonly string[]
  defaultSourceId: string
  notifyUserIds: readonly string[]
  notifyGroupIds: readonly string[]
  onDefaultOwnerChange: (value: string) => void
  onDefaultAssigneeChange: (value: string[]) => void
  onDefaultSourceChange: (value: string) => void
  onNotifyUsersChange: (value: string[]) => void
  onNotifyGroupsChange: (value: string[]) => void
}>) {
  return (
    <div className="border-t pt-5">
      <h3 className="font-medium">Routing defaults</h3>
      <p className="mt-1 text-sm text-muted-foreground">Accepted leads can be assigned and announced automatically.</p>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <OptionSelect
          label="Default owner"
          options={users}
          onChange={single(onDefaultOwnerChange)}
          value={defaultOwnerId}
        />
        <OptionSelect
          label="Default source"
          options={sources}
          onChange={single(onDefaultSourceChange)}
          value={defaultSourceId}
        />
        <OptionSelect
          label="Default assignees"
          multiple
          options={users}
          onChange={many(onDefaultAssigneeChange)}
          value={defaultAssigneeIds}
        />
        <OptionSelect
          label="Notify users"
          multiple
          options={users}
          onChange={many(onNotifyUsersChange)}
          value={notifyUserIds}
        />
        <OptionSelect
          label="Notify groups"
          multiple
          options={groups}
          onChange={many(onNotifyGroupsChange)}
          value={notifyGroupIds}
        />
      </div>
    </div>
  )
}

export function SuccessBehaviorSection({
  successMessage,
  redirectUrl,
  onMessageChange,
  onRedirectChange,
}: Readonly<{
  successMessage: string
  redirectUrl: string
  onMessageChange: (value: string) => void
  onRedirectChange: (value: string) => void
}>) {
  return (
    <div className="border-t pt-5">
      <h3 className="font-medium">Success behavior</h3>
      <div className="mt-4 grid gap-4">
        <label className="grid gap-1 text-sm">
          <span className="font-medium">Success message</span>
          <textarea
            className={textAreaClass}
            maxLength={500}
            onChange={(event) => {
              onMessageChange(event.target.value)
            }}
            value={successMessage}
          />
        </label>
        <label className="grid gap-1 text-sm">
          <span className="font-medium">Redirect URL (optional)</span>
          <input
            className={inputClass}
            onChange={(event) => {
              onRedirectChange(event.target.value)
            }}
            placeholder="https://www.example.com/thanks"
            type="url"
            value={redirectUrl}
          />
          <span className="text-xs text-muted-foreground">
            Browser form POSTs receive a 303 redirect when set; API clients still receive JSON.
          </span>
        </label>
      </div>
    </div>
  )
}
