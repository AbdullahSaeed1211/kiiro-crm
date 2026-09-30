'use client'

import { useVersionedAction } from '../use-versioned-action'
import { Button } from '@ops/ui/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@ops/ui/components/ui/dialog'
import { useEffect, useState } from 'react'
import { convertLead } from '../../../server/crm/leads/actions'
import { searchConversionOptions, suggestedMatches } from '../../../server/actions/crm/conversion-options'
import type { LeadPageData } from '../../../server/crm/leads/types'
import type { ConversionOption } from '../../../server/actions/crm/conversion-options'
import {
  ContactField,
  DealFields,
  OrganizationField,
  type ContactSelection,
  type OrgSelection,
} from './ConvertDialogFields'

type DialogProps = Readonly<{
  data: LeadPageData
  currency: string
  open: boolean
  onOpenChange: (open: boolean) => void
}>

type OrgInput = { existingId: string } | { create: { name: string } } | null
type ContactInput = { existingId: string } | { create: true }

interface DialogState {
  orgSelection: OrgSelection
  orgName: string
  selectedOrgId: string | undefined
  orgOptions: readonly ConversionOption[]
  suggestedOrgId: string | undefined
  contactSelection: ContactSelection
  selectedContactId: string | undefined
  contactOptions: readonly ConversionOption[]
  suggestedContactId: string | undefined
  dealTitle: string
  value: string
}

const initialState = (dealTitle: string, companyName: string | null): DialogState => ({
  orgSelection: companyName === null ? 'none' : 'create',
  orgName: companyName ?? '',
  selectedOrgId: undefined,
  orgOptions: [],
  suggestedOrgId: undefined,
  contactSelection: 'create',
  selectedContactId: undefined,
  contactOptions: [],
  suggestedContactId: undefined,
  dealTitle,
  value: '',
})

function buildOrgInput(state: DialogState): OrgInput {
  const { orgSelection, orgName, selectedOrgId } = state
  if (orgSelection === 'none') {
    return null
  }
  if (orgSelection === 'existing' && selectedOrgId) return { existingId: selectedOrgId }
  const name = orgName.trim()
  return name === '' ? null : { create: { name } }
}

function buildContactInput(state: DialogState): ContactInput {
  return state.contactSelection === 'existing' && state.selectedContactId
    ? { existingId: state.selectedContactId }
    : { create: true }
}

function ConvertFooter({
  pending,
  onCancel,
  onSubmit,
}: Readonly<{ pending: boolean; onCancel: () => void; onSubmit: () => void }>) {
  return (
    <DialogFooter>
      <Button type="button" variant="outline" onClick={onCancel}>
        Cancel
      </Button>
      <Button type="button" disabled={pending} onClick={onSubmit}>
        {pending ? 'Converting…' : 'Convert lead'}
      </Button>
    </DialogFooter>
  )
}

function DialogContent_(
  props: Readonly<{
    state: DialogState
    onStateChange: (updater: (prev: DialogState) => DialogState) => void
    onSearch: (query: string, isOrg: boolean) => void
    onOpenChange: (open: boolean) => void
    onSubmit: () => void
    currency: string
    pending: boolean
    error: string | undefined
  }>,
) {
  return (
    <>
      <div className="grid gap-4 py-2">
        <OrganizationField
          selection={props.state.orgSelection}
          onSelection={(v) => {
            props.onStateChange((prev) => ({ ...prev, orgSelection: v }))
          }}
          name={props.state.orgName}
          onName={(v) => {
            props.onStateChange((prev) => ({ ...prev, orgName: v }))
          }}
          selectedId={props.state.selectedOrgId}
          onSelectedId={(id) => {
            props.onStateChange((prev) => ({ ...prev, selectedOrgId: id }))
          }}
          options={props.state.orgOptions}
          onSearch={(q) => {
            props.onSearch(q, true)
          }}
          suggestedId={props.state.suggestedOrgId}
        />
        <ContactField
          selection={props.state.contactSelection}
          onSelection={(v) => {
            props.onStateChange((prev) => ({ ...prev, contactSelection: v }))
          }}
          selectedId={props.state.selectedContactId}
          onSelectedId={(id) => {
            props.onStateChange((prev) => ({ ...prev, selectedContactId: id }))
          }}
          options={props.state.contactOptions}
          onSearch={(q) => {
            props.onSearch(q, false)
          }}
          suggestedId={props.state.suggestedContactId}
        />
        <DealFields
          dealTitle={props.state.dealTitle}
          onDealTitle={(v) => {
            props.onStateChange((prev) => ({ ...prev, dealTitle: v }))
          }}
          value={props.state.value}
          currency={props.currency}
          onValue={(v) => {
            props.onStateChange((prev) => ({ ...prev, value: v }))
          }}
        />
      </div>
      {props.error && (
        <p role="alert" className="text-sm text-destructive">
          {props.error}
        </p>
      )}
      <ConvertFooter
        pending={props.pending}
        onCancel={() => {
          props.onOpenChange(false)
        }}
        onSubmit={props.onSubmit}
      />
    </>
  )
}

export function ConvertDialog(props: DialogProps) {
  const { run, error, pending } = useVersionedAction({ refreshOnSuccess: true })
  const lead = props.data.item.lead
  const [state, setState] = useState<DialogState>(initialState(lead.title, lead.companyName))

  useEffect(() => {
    const load = async () => {
      const result = await suggestedMatches({ leadId: lead.id })
      if (!result.ok) return
      const { organizations, contacts } = result.data
      setState((prev) => ({
        ...prev,
        suggestedOrgId: organizations[0]?.id,
        orgSelection: organizations.length > 0 ? 'existing' : prev.orgSelection,
        selectedOrgId: organizations[0]?.id,
        orgOptions: organizations,
        suggestedContactId: contacts[0]?.id,
        contactSelection: contacts.length > 0 ? 'existing' : prev.contactSelection,
        selectedContactId: contacts[0]?.id,
        contactOptions: contacts,
      }))
    }
    void load()
  }, [lead.id])

  const handleSearch = async (query: string, isOrg: boolean) => {
    const result = await searchConversionOptions({ query })
    if (result.ok) {
      setState((prev) => ({
        ...prev,
        [isOrg ? 'orgOptions' : 'contactOptions']: isOrg ? result.data.organizations : result.data.contacts,
      }))
    }
  }

  const handleSubmit = async () => {
    const converted = await run(() =>
      convertLead({
        leadId: lead.id,
        expectedUpdatedAt: lead.updatedAt,
        organization: buildOrgInput(state),
        contact: buildContactInput(state),
        deal: {
          title: state.dealTitle.trim() || undefined,
          value: state.value.trim()
            ? { amountMinor: Math.round(Number(state.value) * 100), currency: props.currency }
            : null,
        },
      }),
    )
    if (converted !== null) props.onOpenChange(false)
  }

  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Convert lead</DialogTitle>
          <DialogDescription>Create a contact and deal from this lead. Organization is optional.</DialogDescription>
        </DialogHeader>
        <DialogContent_
          state={state}
          onStateChange={setState}
          onSearch={(q, isOrg) => {
            void handleSearch(q, isOrg)
          }}
          onOpenChange={props.onOpenChange}
          onSubmit={() => {
            void handleSubmit()
          }}
          currency={props.currency}
          pending={pending}
          error={error}
        />
      </DialogContent>
    </Dialog>
  )
}
