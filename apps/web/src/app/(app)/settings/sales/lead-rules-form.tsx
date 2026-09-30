'use client'

import { Button } from '@ops/ui/components/ui/button'
import { Input } from '@ops/ui/components/ui/input'
import { NativeSelect } from '@ops/ui/components/ui/native-select'
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
  return (
    <div className="grid gap-2 rounded-md border p-3">
      <Input
        aria-label="Rule name"
        placeholder="Rule name"
        value={rule.name}
        onChange={(event) => {
          onChange({ ...rule, name: event.target.value })
        }}
      />
      <NativeSelect
        aria-label="Lead source"
        value={rule.sourceId ?? ''}
        onChange={(event) => {
          onChange({ ...rule, sourceId: event.target.value === '' ? null : event.target.value })
        }}
      >
        <option value="">Every new lead</option>
        {sources.map((source) => (
          <option key={source.id} value={source.id}>
            Only leads from {source.name}
          </option>
        ))}
      </NativeSelect>
      <CheckboxGroup
        label="Give the leads to (in turn)"
        options={people}
        values={rule.ownerIds}
        onChange={(ownerIds) => {
          onChange({ ...rule, ownerIds })
        }}
      />
      <Button variant="ghost" size="sm" className="w-fit" onClick={onRemove}>
        Remove rule
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
  const [rules, setRules] = useState<readonly Rule[]>(initial)
  const { save, message, pending } = useSave(saveLeadRules)
  return (
    <div className="grid gap-3 text-sm">
      <h2 className="font-medium">Lead assignment</h2>
      <p className="text-muted-foreground">
        A new lead with no owner goes to the next person in the rule that matches its source. A rule for one source wins
        over the "every new lead" rule. An owner chosen on the lead is never changed.
      </p>
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
          Add rule
        </Button>
        <Button
          size="sm"
          disabled={pending}
          onClick={() => {
            save(rules)
          }}
        >
          Save rules
        </Button>
        {message === null ? null : <span role="status">{message}</span>}
      </div>
    </div>
  )
}
