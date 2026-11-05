'use client'

import {
  TRIGGER_KINDS,
  type AutomationRule,
  type RuleCondition,
  type RuleTrigger,
  type TriggerKind,
} from '@ops/module-automation'
import { Button } from '@ops/ui/components/ui/button'
import { Checkbox } from '@ops/ui/components/ui/checkbox'
import { Input } from '@ops/ui/components/ui/input'
import { NativeSelect } from '@ops/ui/components/ui/native-select'
import { catalogFor } from '../../../../i18n/locale'
import { useLocale } from '../../../../i18n/locale-context'
import { AUTOMATION_COPY } from '../../../../i18n/automation-copy'
import { ActionEditor, newAction } from './action-editor'
import { ConditionEditor } from './condition-editor'
import type { Choices } from './types'

const NEW_CONDITION: RuleCondition = { field: 'source', op: 'is', value: '' }
const NO_REPLY_TRIGGER = 'lead.no_reply' as const

function nextTrigger(kind: TriggerKind, current: RuleTrigger): RuleTrigger {
  switch (kind) {
    case NO_REPLY_TRIGGER:
      return { kind, days: current.kind === NO_REPLY_TRIGGER ? current.days : 3 }
    case 'lead.created':
      return { kind }
    case 'deal.stage_changed':
      return { kind }
    case 'deal.won':
      return { kind }
    case 'deal.lost':
      return { kind }
    case 'task.overdue':
      return { kind }
  }
}

function RuleHeader({
  rule,
  onChange,
  onRemove,
}: Readonly<{ rule: AutomationRule; onChange: (next: AutomationRule) => void; onRemove: () => void }>) {
  const copy = catalogFor(AUTOMATION_COPY, useLocale())
  return (
    <div className="flex flex-wrap items-end gap-3">
      <label className="grid min-w-48 flex-1 gap-1 text-xs">
        <span className="font-medium">{copy.ruleName}</span>
        <Input
          value={rule.name}
          maxLength={80}
          onChange={(event) => {
            onChange({ ...rule, name: event.target.value })
          }}
        />
      </label>
      <label className="flex items-center gap-2 pb-2 text-sm">
        <Checkbox
          checked={rule.enabled}
          onCheckedChange={(checked) => {
            onChange({ ...rule, enabled: checked })
          }}
        />
        {copy.enabled}
      </label>
      <Button variant="ghost" size="sm" className="text-destructive" onClick={onRemove}>
        {copy.removeRule}
      </Button>
    </div>
  )
}

function TriggerFields({
  rule,
  onChange,
}: Readonly<{ rule: AutomationRule; onChange: (next: AutomationRule) => void }>) {
  const copy = catalogFor(AUTOMATION_COPY, useLocale())
  return (
    <div className="flex flex-wrap items-end gap-2">
      <label className="grid gap-1 text-xs">
        <span className="font-medium">{copy.trigger}</span>
        <NativeSelect
          value={rule.trigger.kind}
          onChange={(event) => {
            onChange({ ...rule, trigger: nextTrigger(event.target.value as TriggerKind, rule.trigger) })
          }}
        >
          {TRIGGER_KINDS.map((kind) => (
            <option key={kind} value={kind}>
              {copy.triggers[kind]}
            </option>
          ))}
        </NativeSelect>
      </label>
      {rule.trigger.kind === NO_REPLY_TRIGGER ? (
        <label className="grid gap-1 text-xs">
          <span className="font-medium">{copy.noReplyDays}</span>
          <Input
            type="number"
            min={1}
            max={365}
            className="w-24"
            value={rule.trigger.days}
            onChange={(event) => {
              onChange({ ...rule, trigger: { kind: NO_REPLY_TRIGGER, days: Number(event.target.value) } })
            }}
          />
        </label>
      ) : null}
    </div>
  )
}

function ConditionsSection({
  rule,
  choices,
  onChange,
}: Readonly<{ rule: AutomationRule; choices: Choices; onChange: (next: AutomationRule) => void }>) {
  const copy = catalogFor(AUTOMATION_COPY, useLocale())
  return (
    <div className="grid gap-2">
      <div>
        <h3 className="text-sm font-medium">{copy.conditionsTitle}</h3>
        <p className="text-xs text-muted-foreground">{copy.conditionsHelp}</p>
      </div>
      {rule.conditions.map((condition, index) => (
        <ConditionEditor
          key={index}
          condition={condition}
          choices={choices}
          onChange={(next: RuleCondition) => {
            onChange({ ...rule, conditions: rule.conditions.map((entry, at) => (at === index ? next : entry)) })
          }}
          onRemove={() => {
            onChange({ ...rule, conditions: rule.conditions.filter((_, at) => at !== index) })
          }}
        />
      ))}
      <Button
        variant="outline"
        size="sm"
        className="w-fit"
        disabled={rule.conditions.length >= 5}
        onClick={() => {
          onChange({ ...rule, conditions: [...rule.conditions, NEW_CONDITION] })
        }}
      >
        {copy.addCondition}
      </Button>
    </div>
  )
}

function ActionsSection({
  rule,
  choices,
  onChange,
}: Readonly<{ rule: AutomationRule; choices: Choices; onChange: (next: AutomationRule) => void }>) {
  const copy = catalogFor(AUTOMATION_COPY, useLocale())
  return (
    <div className="grid gap-2">
      <div>
        <h3 className="text-sm font-medium">{copy.actionsTitle}</h3>
        <p className="text-xs text-muted-foreground">{copy.actionsHelp}</p>
      </div>
      {rule.actions.map((action, index) => (
        <ActionEditor
          key={index}
          action={action}
          people={choices.people}
          onChange={(next) => {
            onChange({ ...rule, actions: rule.actions.map((entry, at) => (at === index ? next : entry)) })
          }}
          onRemove={() => {
            onChange({ ...rule, actions: rule.actions.filter((_, at) => at !== index) })
          }}
        />
      ))}
      <Button
        variant="outline"
        size="sm"
        className="w-fit"
        disabled={rule.actions.length >= 5}
        onClick={() => {
          onChange({ ...rule, actions: [...rule.actions, newAction('notify', choices.people)] })
        }}
      >
        {copy.addAction}
      </Button>
    </div>
  )
}

/** One rule: name, trigger, conditions and actions, all changed locally until the form is saved. */
export function RuleEditor({
  rule,
  choices,
  onChange,
  onRemove,
}: Readonly<{
  rule: AutomationRule
  choices: Choices
  onChange: (next: AutomationRule) => void
  onRemove: () => void
}>) {
  return (
    <div className="grid gap-3 rounded-lg border p-4">
      <RuleHeader rule={rule} onChange={onChange} onRemove={onRemove} />
      <TriggerFields rule={rule} onChange={onChange} />
      <ConditionsSection rule={rule} choices={choices} onChange={onChange} />
      <ActionsSection rule={rule} choices={choices} onChange={onChange} />
    </div>
  )
}
