'use client'

import {
  CONDITION_FIELDS,
  CONDITION_OPS,
  type ConditionField,
  type ConditionOp,
  type RuleCondition,
} from '@ops/module-automation'
import { Button } from '@ops/ui/components/ui/button'
import { Input } from '@ops/ui/components/ui/input'
import { NativeSelect } from '@ops/ui/components/ui/native-select'
import { catalogFor } from '../../../../i18n/locale'
import { useLocale } from '../../../../i18n/locale-context'
import { AUTOMATION_COPY, type AutomationCopy } from '../../../../i18n/automation-copy'
import type { Choice, Choices, StageChoice } from './types'

function opsFor(field: ConditionField): readonly ConditionOp[] {
  return field === 'value' ? CONDITION_OPS : ['is', 'is_not']
}

function startingValue(field: ConditionField): string | number {
  return field === 'value' ? 0 : ''
}

function Picker({
  label,
  value,
  options,
  copy,
  onChange,
}: Readonly<{
  label: string
  value: string
  options: readonly Choice[]
  copy: AutomationCopy
  onChange: (value: string) => void
}>) {
  return (
    <NativeSelect
      aria-label={label}
      value={value}
      onChange={(event) => {
        onChange(event.target.value)
      }}
    >
      <option value="">{copy.chooseValue}</option>
      {options.map((option) => (
        <option key={option.id} value={option.id}>
          {option.name}
        </option>
      ))}
    </NativeSelect>
  )
}

function StagePicker({
  value,
  stages,
  copy,
  onChange,
}: Readonly<{
  value: string
  stages: readonly StageChoice[]
  copy: AutomationCopy
  onChange: (value: string) => void
}>) {
  return (
    <NativeSelect
      aria-label={copy.fields.stage}
      value={value}
      onChange={(event) => {
        onChange(event.target.value)
      }}
    >
      <option value="">{copy.chooseValue}</option>
      {(['lead', 'deal'] as const).map((group) => (
        <optgroup key={group} label={copy.stageGroups[group]}>
          {stages
            .filter((stage) => stage.group === group)
            .map((stage) => (
              <option key={stage.id} value={stage.id}>
                {stage.name}
              </option>
            ))}
        </optgroup>
      ))}
    </NativeSelect>
  )
}

function ValueInput({
  condition,
  choices,
  copy,
  onChange,
}: Readonly<{
  condition: RuleCondition
  choices: Choices
  copy: AutomationCopy
  onChange: (value: string | number) => void
}>) {
  const text = String(condition.value)
  switch (condition.field) {
    case 'value':
      return (
        <Input
          aria-label={copy.value}
          type="number"
          className="w-28"
          value={typeof condition.value === 'number' ? condition.value : 0}
          onChange={(event) => {
            onChange(event.target.value === '' ? 0 : Number(event.target.value))
          }}
        />
      )
    case 'source':
      return (
        <Picker label={copy.fields.source} value={text} options={choices.sources} copy={copy} onChange={onChange} />
      )
    case 'owner':
      return <Picker label={copy.fields.owner} value={text} options={choices.people} copy={copy} onChange={onChange} />
    case 'stage':
      return <StagePicker value={text} stages={choices.stages} copy={copy} onChange={onChange} />
  }
}

/** One condition: a field, a comparison, and the value a record must match. */
export function ConditionEditor({
  condition,
  choices,
  onChange,
  onRemove,
}: Readonly<{
  condition: RuleCondition
  choices: Choices
  onChange: (next: RuleCondition) => void
  onRemove: () => void
}>) {
  const copy = catalogFor(AUTOMATION_COPY, useLocale())
  return (
    <div className="flex flex-wrap items-end gap-2">
      <NativeSelect
        aria-label={copy.field}
        value={condition.field}
        onChange={(event) => {
          const field = event.target.value as ConditionField
          onChange({
            field,
            op: condition.op === 'gte' || condition.op === 'lte' ? 'is' : condition.op,
            value: startingValue(field),
          })
        }}
      >
        {CONDITION_FIELDS.map((field) => (
          <option key={field} value={field}>
            {copy.fields[field]}
          </option>
        ))}
      </NativeSelect>
      <NativeSelect
        aria-label={copy.op}
        value={condition.op}
        onChange={(event) => {
          onChange({ ...condition, op: event.target.value as ConditionOp })
        }}
      >
        {opsFor(condition.field).map((op) => (
          <option key={op} value={op}>
            {copy.ops[op]}
          </option>
        ))}
      </NativeSelect>
      <ValueInput
        condition={condition}
        choices={choices}
        copy={copy}
        onChange={(value) => {
          onChange({ ...condition, value })
        }}
      />
      <Button variant="ghost" size="sm" onClick={onRemove}>
        {copy.removeCondition}
      </Button>
    </div>
  )
}
