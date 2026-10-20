'use client'

import { Button } from '@ops/ui/components/ui/button'
import { Command, CommandInput, CommandItem, CommandList } from '@ops/ui/components/ui/command'
import { Input } from '@ops/ui/components/ui/input'
import { Label } from '@ops/ui/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@ops/ui/components/ui/popover'
import { ToggleGroup, ToggleGroupItem } from '@ops/ui/components/ui/toggle-group'
import { catalogFor } from '../../../i18n/locale'
import { useLocale } from '../../../i18n/locale-context'
import { LEAD_CONVERT_COPY, type LeadConvertCopy } from '../../../i18n/lead-convert-copy'
import type { ConversionOption } from '../../../server/actions/crm/conversion-options'

export type OrgSelection = 'create' | 'existing' | 'none'
export type ContactSelection = 'create' | 'existing'

type Choice<T extends string> = Readonly<{ value: T; label: string }>

function ChoiceToggle<T extends string>({
  value,
  choices,
  onChange,
}: Readonly<{ value: T; choices: readonly Choice<T>[]; onChange: (value: T) => void }>) {
  return (
    <ToggleGroup
      value={[value]}
      onValueChange={(values) => {
        const next = choices.find((choice) => choice.value === values[0])
        if (next !== undefined) onChange(next.value)
      }}
    >
      {choices.map((choice) => (
        <ToggleGroupItem key={choice.value} value={choice.value} size="sm">
          {choice.label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  )
}

/** Search and pick one existing record, and point out the record the lead most likely matches. */
function ExistingPicker(
  props: Readonly<{
    noun: string
    options: readonly ConversionOption[]
    selectedId: string | undefined
    suggestedId: string | undefined
    onSelectedId: (id: string) => void
    onSearch: (query: string) => void
  }>,
) {
  const copy = catalogFor(LEAD_CONVERT_COPY, useLocale())
  const selected = props.options.find((option) => option.id === props.selectedId)
  const suggested = props.options.find((option) => option.id === props.suggestedId)
  return (
    <div className="grid gap-2">
      <Popover>
        <PopoverTrigger render={<Button variant="outline" className="justify-start" />}>
          {selected?.name ?? copy.selectNoun.replace('{noun}', props.noun)}
        </PopoverTrigger>
        <PopoverContent className="w-72 p-1">
          <Command>
            <CommandInput placeholder={copy.searchNoun.replace('{noun}', props.noun)} onValueChange={props.onSearch} />
            <CommandList>
              {props.options.map((option) => (
                <CommandItem
                  key={option.id}
                  value={option.name}
                  onSelect={() => {
                    props.onSelectedId(option.id)
                  }}
                >
                  {option.name}
                </CommandItem>
              ))}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {suggested !== undefined && props.selectedId === undefined && (
        <p className="text-xs text-amber-600">{copy.possibleMatch.replace('{name}', suggested.name)}</p>
      )}
    </div>
  )
}

type PickerProps = Readonly<{
  options: readonly ConversionOption[]
  selectedId: string | undefined
  suggestedId: string | undefined
  onSelectedId: (id: string) => void
  onSearch: (query: string) => void
}>

const contactChoices = (copy: LeadConvertCopy): readonly Choice<ContactSelection>[] => [
  { value: 'create', label: copy.createNew },
  { value: 'existing', label: copy.useExisting },
]

const orgChoices = (copy: LeadConvertCopy): readonly Choice<OrgSelection>[] => [
  ...contactChoices(copy),
  { value: 'none', label: copy.skip },
]

export function OrganizationField(
  props: PickerProps &
    Readonly<{
      selection: OrgSelection
      onSelection: (value: OrgSelection) => void
      name: string
      onName: (value: string) => void
    }>,
) {
  const copy = catalogFor(LEAD_CONVERT_COPY, useLocale())
  return (
    <div className="grid gap-2">
      <Label>{copy.organization}</Label>
      <ChoiceToggle value={props.selection} choices={orgChoices(copy)} onChange={props.onSelection} />
      {props.selection === 'create' && (
        <Input
          value={props.name}
          onChange={(event) => {
            props.onName(event.target.value)
          }}
          placeholder={copy.organizationName}
        />
      )}
      {props.selection === 'existing' && <ExistingPicker noun={copy.nounOrganization} {...props} />}
    </div>
  )
}

export function ContactField(
  props: PickerProps & Readonly<{ selection: ContactSelection; onSelection: (value: ContactSelection) => void }>,
) {
  const copy = catalogFor(LEAD_CONVERT_COPY, useLocale())
  return (
    <div className="grid gap-2">
      <Label>{copy.contact}</Label>
      <ChoiceToggle value={props.selection} choices={contactChoices(copy)} onChange={props.onSelection} />
      {props.selection === 'existing' && <ExistingPicker noun={copy.nounContact} {...props} />}
    </div>
  )
}

export function DealFields(
  props: Readonly<{
    dealTitle: string
    onDealTitle: (value: string) => void
    value: string
    currency: string
    onValue: (value: string) => void
  }>,
) {
  const copy = catalogFor(LEAD_CONVERT_COPY, useLocale())
  return (
    <>
      <div className="grid gap-2">
        <Label htmlFor="convert-deal">{copy.dealTitle}</Label>
        <Input
          id="convert-deal"
          value={props.dealTitle}
          onChange={(event) => {
            props.onDealTitle(event.target.value)
          }}
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="convert-value">{copy.dealValue.replace('{currency}', props.currency)}</Label>
        <Input
          id="convert-value"
          type="number"
          min="0"
          step="0.01"
          value={props.value}
          onChange={(event) => {
            props.onValue(event.target.value)
          }}
          placeholder="0.00"
        />
      </div>
    </>
  )
}
