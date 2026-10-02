'use client'

import Link from 'next/link'
import { Button } from '@ops/ui/components/ui/button'
import { Label } from '@ops/ui/components/ui/label'
import { useState } from 'react'
import { catalogFor } from '../../../i18n/locale'
import { useLocale } from '../../../i18n/locale-context'
import { DEAL_CONTACTS_COPY } from '../../../i18n/deal-contacts-copy'
import { updateDealAction, type DealActionResult } from '../../../server/crm/deals/actions'
import { RecordPicker } from '../RecordPicker'

interface Contact {
  readonly id: string
  readonly name: string
}

interface Deal {
  readonly id: string
  readonly updatedAt: number
  readonly contactIds: readonly string[]
  readonly primaryContactId: string | null
}

type Run = (task: () => Promise<DealActionResult>, onFailure?: () => void) => void

type Copy = (typeof DEAL_CONTACTS_COPY)['en']

function ContactRow({
  id,
  name,
  isPrimary,
  pending,
  copy,
  actions,
}: Readonly<{
  id: string
  name: string
  isPrimary: boolean
  pending: boolean
  copy: Copy
  actions: Readonly<{ onPrimary: () => void; onRemove: () => void }>
}>) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <Link href={`/contacts/${id}`} className="min-w-0 flex-1 truncate hover:underline">
        {name}
      </Link>
      <label className="flex items-center gap-1 text-xs text-muted-foreground">
        <input
          aria-label={copy.primaryFor.replace('{name}', name)}
          type="radio"
          name="primary-contact"
          checked={isPrimary}
          onChange={actions.onPrimary}
          disabled={pending}
        />
        {copy.primary}
      </label>
      <Button
        size="sm"
        variant="ghost"
        type="button"
        disabled={pending}
        aria-label={copy.removeFor.replace('{name}', name)}
        onClick={actions.onRemove}
      >
        {copy.remove}
      </Button>
    </div>
  )
}

/** The deal's contact list and main contact, saved on every change and rolled back if the save fails. */
function useDealContacts(input: Readonly<{ deal: Deal; contacts: readonly Contact[]; run: Run }>) {
  const { deal, contacts, run } = input
  const [selected, setSelected] = useState<readonly string[]>(deal.contactIds)
  const [primary, setPrimary] = useState<string | null>(deal.primaryContactId)
  const [names, setNames] = useState(() => new Map(contacts.map((contact) => [contact.id, contact.name])))
  const save = (next: readonly string[]) => {
    const nextPrimary = next.includes(primary ?? '') ? primary : (next[0] ?? null)
    setSelected(next)
    setPrimary(nextPrimary)
    run(
      () =>
        updateDealAction({
          id: deal.id,
          expectedUpdatedAt: deal.updatedAt,
          patch: { contactIds: next, primaryContactId: nextPrimary },
        }),
      () => {
        setSelected(deal.contactIds)
        setPrimary(deal.primaryContactId)
      },
    )
  }
  const makePrimary = (id: string) => {
    const previous = primary
    setPrimary(id)
    run(
      () => updateDealAction({ id: deal.id, expectedUpdatedAt: deal.updatedAt, patch: { primaryContactId: id } }),
      () => {
        setPrimary(previous)
      },
    )
  }
  const add = (contact: Contact) => {
    if (selected.includes(contact.id)) return
    setNames(new Map(names).set(contact.id, contact.name))
    save([...selected, contact.id])
  }
  return { selected, primary, names, save, makePrimary, add }
}

/**
 * The contacts on a deal: the ones already attached, each with a main-contact choice and a Remove button, and a
 * searched pick list to add another, so a deal never loads every contact in the workspace.
 */
export function ContactPicker({
  deal,
  contacts,
  pending,
  run,
}: Readonly<{ deal: Deal; contacts: readonly Contact[]; pending: boolean; run: Run }>) {
  const copy = catalogFor(DEAL_CONTACTS_COPY, useLocale())
  const { selected, primary, names, save, makePrimary, add } = useDealContacts({ deal, contacts, run })
  const [adding, setAdding] = useState<Contact>()
  const [picking, setPicking] = useState(false)
  return (
    <div className="grid gap-2">
      <Label>{copy.title}</Label>
      <div className="grid gap-2 rounded-lg border border-border p-3">
        {selected.length === 0 ? <span className="text-sm text-muted-foreground">{copy.none}</span> : null}
        {selected.map((id) => (
          <ContactRow
            key={id}
            id={id}
            name={names.get(id) ?? id}
            isPrimary={primary === id}
            pending={pending}
            copy={copy}
            actions={{
              onPrimary: () => {
                makePrimary(id)
              },
              onRemove: () => {
                save(selected.filter((contactId) => contactId !== id))
              },
            }}
          />
        ))}
        {picking ? (
          <div className="flex items-center gap-2 border-t pt-2">
            <div className="min-w-0 flex-1">
              <RecordPicker
                key={selected.length}
                id="deal-add-contact"
                name="addContact"
                type="contact"
                emptyLabel={copy.pick}
                label={copy.pick}
                onChoose={setAdding}
              />
            </div>
            <Button
              size="sm"
              type="button"
              disabled={pending || adding === undefined}
              onClick={() => {
                if (adding !== undefined) add(adding)
                setAdding(undefined)
                setPicking(false)
              }}
            >
              {copy.add}
            </Button>
          </div>
        ) : (
          <Button
            size="sm"
            variant="outline"
            type="button"
            className="w-fit"
            disabled={pending}
            onClick={() => {
              setPicking(true)
            }}
          >
            {copy.addContact}
          </Button>
        )}
      </div>
    </div>
  )
}
