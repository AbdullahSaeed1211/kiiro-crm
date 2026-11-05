'use client'

import type { AutomationRule } from '@ops/module-automation'
import { Button } from '@ops/ui/components/ui/button'
import { useState } from 'react'
import { catalogFor } from '../../../../i18n/locale'
import { useLocale } from '../../../../i18n/locale-context'
import { AUTOMATION_COPY } from '../../../../i18n/automation-copy'
import { saveAutomationRules } from '../../../../server/actions/settings/automation'
import { RuleEditor } from './rule-editor'
import type { Choices } from './types'
import { useSave } from './use-save'

const MAX_RULES = 20

function newRule(choices: Choices): AutomationRule {
  return {
    id: crypto.randomUUID(),
    name: '',
    enabled: true,
    createdById: '',
    trigger: { kind: 'lead.created' },
    conditions: [],
    actions: [{ kind: 'notify', userId: choices.people[0]?.id ?? '' }],
  }
}

/** Every workspace rule in one form; changes stay local until the whole list is saved. */
export function AutomationRulesForm({
  initial,
  ...choices
}: Readonly<{ initial: readonly AutomationRule[] } & Choices>) {
  const copy = catalogFor(AUTOMATION_COPY, useLocale())
  const [rules, setRules] = useState<readonly AutomationRule[]>(initial)
  const { save, message, pending } = useSave(saveAutomationRules)
  return (
    <div className="grid gap-3 text-sm">
      <div>
        <h2 className="font-medium">{copy.rulesTitle}</h2>
        <p className="text-muted-foreground">{copy.rulesHelp}</p>
      </div>
      {rules.length === 0 ? <p className="text-muted-foreground">{copy.emptyRules}</p> : null}
      {rules.map((rule, index) => (
        <RuleEditor
          key={rule.id}
          rule={rule}
          choices={choices}
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
          disabled={rules.length >= MAX_RULES}
          onClick={() => {
            setRules([...rules, newRule(choices)])
          }}
        >
          {copy.addRule}
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
