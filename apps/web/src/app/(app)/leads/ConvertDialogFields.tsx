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

export function OrganizationField(
  props: Readonly<{
    selection: OrgSelection
    onSelection: (value: OrgSelection) => void
    name: string
    onName: (value: string) => void
    selectedId: string | undefined
    onSelectedId: (id: string) => void
    options: readonly ConversionOption[]
    onSearch: (query: string) => void
    suggestedId: string | undefined
  }>,
) {
  const selected = props.options.find((o) => o.id === props.selectedId)
  const suggested = props.options.find((o) => o.id === props.suggestedId)

  return (
    <div className="grid gap-2">
      <Label>Organization</Label>
      <ToggleGroup
        value={[props.selection]}
        onValueChange={(values) => {
          if (values.length > 0) {
            props.onSelection(values[0] as OrgSelection)
          }
        }}
      >
        <ToggleGroupItem value="create" size="sm">
          Create new
        </ToggleGroupItem>
        <ToggleGroupItem value="existing" size="sm">
          Use existing
        </ToggleGroupItem>
        <ToggleGroupItem value="none" size="sm">
          Skip
        </ToggleGroupItem>
      </ToggleGroup>
      {props.selection === 'create' && (
        <Input
          value={props.name}
          onChange={(event) => {
            props.onName(event.target.value)
          }}
          placeholder="Organization name"
        />
      )}
      {props.selection === 'existing' && (
        <div className="grid gap-2">
          <Popover>
            <PopoverTrigger render={<Button variant="outline" className="justify-start" />}>
              {selected?.name ?? 'Select organization'}
            </PopoverTrigger>
            <PopoverContent className="w-72 p-1">
              <Command>
                <CommandInput placeholder="Search organizations" onValueChange={props.onSearch} />
                <CommandList>
                  {props.options.map((org) => (
                    <CommandItem
                      key={org.id}
                      value={org.name}
                      onSelect={() => {
                        props.onSelectedId(org.id)
                      }}
                    >
                      {org.name}
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
      )}
    </div>
  )
}

export function ContactField(
  props: Readonly<{
    selection: ContactSelection
    onSelection: (value: ContactSelection) => void
    selectedId: string | undefined
    onSelectedId: (id: string) => void
    options: readonly ConversionOption[]
    onSearch: (query: string) => void
    suggestedId: string | undefined
  }>,
) {
  const selected = props.options.find((c) => c.id === props.selectedId)
  const suggested = props.options.find((c) => c.id === props.suggestedId)

  return (
    <div className="grid gap-2">
      <Label>Contact</Label>
      <ToggleGroup
        value={[props.selection]}
        onValueChange={(values) => {
          if (values.length > 0) {
            props.onSelection(values[0] as ContactSelection)
          }
        }}
      >
        <ToggleGroupItem value="create" size="sm">
          Create new
        </ToggleGroupItem>
        <ToggleGroupItem value="existing" size="sm">
          Use existing
        </ToggleGroupItem>
      </ToggleGroup>
      {props.selection === 'existing' && (
        <div className="grid gap-2">
          <Popover>
            <PopoverTrigger render={<Button variant="outline" className="justify-start" />}>
              {selected?.name ?? 'Select contact'}
            </PopoverTrigger>
            <PopoverContent className="w-72 p-1">
              <Command>
                <CommandInput placeholder="Search contacts" onValueChange={props.onSearch} />
                <CommandList>
                  {props.options.map((contact) => (
                    <CommandItem
                      key={contact.id}
                      value={contact.name}
                      onSelect={() => {
                        props.onSelectedId(contact.id)
                      }}
                    >
                      {contact.name}
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
      )}
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
