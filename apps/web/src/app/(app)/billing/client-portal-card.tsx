'use client'

import { Button } from '@ops/ui/components/ui/button'
import { NativeSelect, NativeSelectOption } from '@ops/ui/components/ui/native-select'
import { ConfirmDialog } from '@ops/ui/composites/ConfirmDialog'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { catalogFor, fill } from '../../../i18n/locale'
import { useLocale } from '../../../i18n/locale-context'
import { PORTAL_STAFF_COPY, type PortalStaffCopy } from '../../../i18n/portal-copy'
import { revokePortal, sharePortal } from '../../../server/actions/billing/portal'
import type { PortalLinkRow, PortalRecipient } from '../../../server/billing/portal-queries'
import { CopyButton } from '../copy-button'
import { StatusChip } from './status-chip'

const CHIP: Readonly<Record<PortalLinkRow['state'], string>> = { active: 'paid', expired: 'expired', revoked: 'void' }

interface Shared {
  readonly url: string
  readonly email: string
}

/** The client and how long its links last, as the server set them. */
interface Client {
  readonly organizationId: string
  readonly company: string
  readonly days: number
}

/** Emails the link through the product's send endpoint, so it is logged on the client like any other email. */
async function emailLink(input: Readonly<{ shared: Shared; client: Client; copy: PortalStaffCopy }>) {
  const { shared, copy, client } = input
  const { company } = client
  const response = await fetch('/api/v1/email/send', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      recordType: 'organization',
      recordId: client.organizationId,
      to: [shared.email],
      subject: fill(copy.emailSubject, { company }),
      textBody: fill(copy.emailBody, { company, url: shared.url, days: client.days }),
    }),
  }).catch(() => undefined)
  return response?.ok === true
}

function SharedLink({ shared, client }: Readonly<{ shared: Shared; client: Client }>) {
  const copy = catalogFor(PORTAL_STAFF_COPY, useLocale())
  const [message, setMessage] = useState(copy.created)
  const [sending, startSending] = useTransition()
  return (
    <div className="grid min-w-0 gap-2 rounded-lg border bg-muted/40 p-3">
      <p className="text-xs text-muted-foreground" role="status">
        {message}
      </p>
      <div className="flex min-w-0 items-center gap-1">
        <code className="min-w-0 flex-1 truncate text-xs">{shared.url}</code>
        <CopyButton value={shared.url} label={copy.copyLabel} />
      </div>
      <Button
        size="sm"
        variant="outline"
        className="w-fit"
        disabled={sending}
        onClick={() => {
          startSending(async () => {
            const sent = await emailLink({ shared, client, copy })
            setMessage(sent ? fill(copy.emailed, { email: shared.email }) : copy.emailFailed)
          })
        }}
      >
        {sending ? copy.emailing : fill(copy.emailIt, { email: shared.email })}
      </Button>
    </div>
  )
}

function CreateLink({
  recipients,
  onShared,
}: Readonly<{ recipients: readonly PortalRecipient[]; onShared: (shared: Shared) => void }>) {
  const copy = catalogFor(PORTAL_STAFF_COPY, useLocale())
  const [contactId, setContactId] = useState(recipients[0]?.id ?? '')
  const [error, setError] = useState('')
  const [pending, startCreate] = useTransition()
  const router = useRouter()
  if (recipients.length === 0) return <p className="text-sm text-muted-foreground">{copy.noRecipients}</p>
  return (
    <div className="flex flex-wrap items-end gap-2">
      <label className="grid gap-1 text-sm">
        <span className="font-medium">{copy.recipient}</span>
        <NativeSelect
          value={contactId}
          onChange={(event) => {
            setContactId(event.target.value)
          }}
        >
          {recipients.map((person) => (
            <NativeSelectOption key={person.id} value={person.id}>
              {person.name === '' ? person.email : `${person.name} · ${person.email}`}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </label>
      <Button
        size="sm"
        disabled={pending || contactId === ''}
        onClick={() => {
          startCreate(async () => {
            const result = await sharePortal({ contactId })
            if (!result.ok) {
              setError(result.error.message)
              return
            }
            setError('')
            onShared(result.data)
            router.refresh()
          })
        }}
      >
        {pending ? copy.creating : copy.create}
      </Button>
      {error === '' ? null : (
        <p className="basis-full text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}

function LinkRow({ link, locale }: Readonly<{ link: PortalLinkRow; locale: string }>) {
  const copy = catalogFor(PORTAL_STAFF_COPY, useLocale())
  const router = useRouter()
  const [revokeFailed, setRevokeFailed] = useState(false)
  const date = (time: number) => new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(time)
  const detail = [
    link.state === 'active' ? fill(copy.until, { date: date(link.expiresAt) }) : '',
    link.lastOpenedAt === null ? copy.neverOpened : fill(copy.opened, { date: date(link.lastOpenedAt) }),
  ].filter(Boolean)
  return (
    <li className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
      <span className="grid min-w-0">
        <span className="truncate font-medium">{link.email}</span>
        <span className="text-xs text-muted-foreground">{detail.join(' · ')}</span>
      </span>
      <span className="flex items-center gap-2">
        <StatusChip status={CHIP[link.state]} label={copy.states[link.state]} />
        {link.state !== 'active' ? null : (
          <ConfirmDialog
            title={copy.revokeTitle}
            description={copy.revokeHelp}
            labels={{ cancel: copy.cancel, confirm: copy.revoke, confirming: copy.revoking }}
            destructive
            onConfirm={async () => {
              const result = await revokePortal({ id: link.id })
              setRevokeFailed(!result.ok)
              if (result.ok) router.refresh()
            }}
            trigger={
              <Button variant="link" size="sm" className="text-destructive" type="button">
                {copy.revoke}
              </Button>
            }
          />
        )}
      </span>
      {revokeFailed ? (
        <span role="alert" className="basis-full text-xs text-destructive">
          {copy.revokeFailed}
        </span>
      ) : null}
    </li>
  )
}

/** Share the client portal with a contact, and see or revoke the links already sent. Owners and managers only. */
export function ClientPortalCard({
  client,
  links,
  recipients,
}: Readonly<{ client: Client; links: readonly PortalLinkRow[]; recipients: readonly PortalRecipient[] }>) {
  const locale = useLocale()
  const copy = catalogFor(PORTAL_STAFF_COPY, locale)
  const [shared, setShared] = useState<Shared | null>(null)
  return (
    <section className="grid min-w-0 gap-3 rounded-xl border bg-card p-4" aria-labelledby="client-portal-title">
      <div className="grid gap-1">
        <h3 id="client-portal-title" className="text-sm font-semibold">
          {copy.title}
        </h3>
        <p className="text-sm text-muted-foreground">{fill(copy.help, { days: client.days })}</p>
      </div>
      <CreateLink recipients={recipients} onShared={setShared} />
      {shared === null ? null : <SharedLink shared={shared} client={client} />}
      {links.length === 0 ? null : (
        <div className="grid gap-1">
          <h4 className="text-xs font-medium text-muted-foreground">{copy.sent}</h4>
          <ul className="divide-y">
            {links.map((link) => (
              <LinkRow key={link.id} link={link} locale={locale === 'es' ? 'es-ES' : 'en-US'} />
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}
