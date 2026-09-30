'use client'

import { Button } from '@ops/ui/components/ui/button'
import { Command, CommandInput, CommandItem, CommandList } from '@ops/ui/components/ui/command'
import { Input } from '@ops/ui/components/ui/input'
import { Label } from '@ops/ui/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@ops/ui/components/ui/popover'
import { ToggleGroup, ToggleGroupItem } from '@ops/ui/components/ui/toggle-group'
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
  const selected = props.options.find((option) => option.id === props.selectedId)
  const suggested = props.options.find((option) => option.id === props.suggestedId)
  return (
    <div className="grid gap-2">
      <Popover>
        <PopoverTrigger render={<Button variant="outline" className="justify-start" />}>
          {selected?.name ?? `Select ${props.noun}`}
        </PopoverTrigger>
        <PopoverContent className="w-72 p-1">
          <Command>
            <CommandInput placeholder={`Search ${props.noun}s`} onValueChange={props.onSearch} />
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
        <p className="text-xs text-amber-600">Possible match: {suggested.name}</p>
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

const ORG_CHOICES: readonly Choice<OrgSelection>[] = [
  { value: 'create', label: 'Create new' },
  { value: 'existing', label: 'Use existing' },
  { value: 'none', label: 'Skip' },
]

const CONTACT_CHOICES: readonly Choice<ContactSelection>[] = [
  { value: 'create', label: 'Create new' },
  { value: 'existing', label: 'Use existing' },
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
  return (
    <div className="grid gap-2">
      <Label>Organization</Label>
      <ChoiceToggle value={props.selection} choices={ORG_CHOICES} onChange={props.onSelection} />
      {props.selection === 'create' && (
        <Input
          value={props.name}
          onChange={(event) => {
            props.onName(event.target.value)
          }}
          placeholder="Organization name"
        />
      )}
      {props.selection === 'existing' && <ExistingPicker noun="organization" {...props} />}
    </div>
  )
}

export function ContactField(
  props: PickerProps & Readonly<{ selection: ContactSelection; onSelection: (value: ContactSelection) => void }>,
) {
  return (
    <div className="grid gap-2">
      <Label>Contact</Label>
      <ChoiceToggle value={props.selection} choices={CONTACT_CHOICES} onChange={props.onSelection} />
      {props.selection === 'existing' && <ExistingPicker noun="contact" {...props} />}
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
  return (
    <>
      <div className="grid gap-2">
        <Label htmlFor="convert-deal">Deal title</Label>
        <Input
          id="convert-deal"
          value={props.dealTitle}
          onChange={(event) => {
            props.onDealTitle(event.target.value)
          }}
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="convert-value">Deal value ({props.currency})</Label>
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
