'use client'

import { Button } from '@ops/ui/components/ui/button'
import { Input } from '@ops/ui/components/ui/input'
import { NativeSelect } from '@ops/ui/components/ui/native-select'
import { catalogFor } from '../../../../i18n/locale'
import { useLocale } from '../../../../i18n/locale-context'
import { SALES_SETTINGS_COPY } from '../../../../i18n/sales-settings-copy'
import { useState } from 'react'
import { saveLeadRules } from '../../../../server/actions/settings/sales'
import { CheckboxGroup } from '../checkbox-group'
import { useSave } from './use-save'

type Rule = Readonly<{ id: string; name: string; sourceId: string | null; ownerIds: readonly string[] }>
type Choice = Readonly<{ id: string; name: string }>

function RuleEditor({
  rule,
  sources,
  people,
  onChange,
  onRemove,
}: Readonly<{
  rule: Rule
  sources: readonly Choice[]
  people: readonly Choice[]
  onChange: (next: Rule) => void
  onRemove: () => void
}>) {
  const copy = catalogFor(SALES_SETTINGS_COPY, useLocale()).rules
  return (
    <div className="grid gap-2 rounded-md border p-3">
      <Input
        aria-label={copy.nameLabel}
        placeholder={copy.nameLabel}
        value={rule.name}
        onChange={(event) => {
          onChange({ ...rule, name: event.target.value })
        }}
      />
      <NativeSelect
        aria-label={copy.sourceLabel}
        value={rule.sourceId ?? ''}
        onChange={(event) => {
          onChange({ ...rule, sourceId: event.target.value === '' ? null : event.target.value })
        }}
      >
        <option value="">{copy.everyLead}</option>
        {sources.map((source) => (
          <option key={source.id} value={source.id}>
            {copy.onlyFrom.replace('{name}', source.name)}
          </option>
        ))}
      </NativeSelect>
      <CheckboxGroup
        label={copy.ownersLabel}
        options={people}
        values={rule.ownerIds}
        onChange={(ownerIds) => {
          onChange({ ...rule, ownerIds })
        }}
      />
      <Button variant="ghost" size="sm" className="w-fit" onClick={onRemove}>
        {copy.remove}
      </Button>
    </div>
  )
}

/** Rules that hand each new lead, from any source, to a person; several people take turns. */
export function LeadRulesForm({
  initial,
  sources,
  people,
}: Readonly<{ initial: readonly Rule[]; sources: readonly Choice[]; people: readonly Choice[] }>) {
  const copy = catalogFor(SALES_SETTINGS_COPY, useLocale()).rules
  const [rules, setRules] = useState<readonly Rule[]>(initial)
  const { save, message, pending } = useSave(saveLeadRules)
  return (
    <div className="grid gap-3 text-sm">
      <h2 className="font-medium">{copy.title}</h2>
      <p className="text-muted-foreground">{copy.help}</p>
      {rules.map((rule, index) => (
        <RuleEditor
          key={rule.id}
          rule={rule}
          sources={sources}
          people={people}
          onChange={(next) => {
            setRules(rules.map((entry, at) => (at === index ? next : entry)))
          }}
          onRemove={() => {
            setRules(rules.filter((_, at) => at !== index))
          }}
        />
      ))}
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setRules([...rules, { id: crypto.randomUUID(), name: '', sourceId: null, ownerIds: [] }])
          }}
        >
          {copy.add}
        </Button>
        <Button
          size="sm"
          disabled={pending}
          onClick={() => {
            save(rules)
          }}
        >
          {copy.save}
        </Button>
        {message === null ? null : <span role="status">{message}</span>}
      </div>
    </div>
  )
}
