import { Button } from '@ops/ui/components/ui/button'
import { ClipboardPlus, Mail, MailWarning, Pencil, Phone } from 'lucide-react'
import type { ReactNode } from 'react'
import Link from 'next/link'
import { SendTextDialog } from './send-text-dialog'
import type { RecordCopy } from '../../i18n/record-copy'

function actionLink({ href, label, icon }: Readonly<{ href: string; label: string; icon: ReactNode }>) {
  return (
    <Button
      key={label}
      variant="outline"
      size="sm"
      nativeButton={false}
      render={
        href.startsWith('/') ? (
          <Link href={href} prefetch={false}>
            {icon}
            {label}
          </Link>
        ) : (
          <a href={href}>
            {icon}
            {label}
          </a>
        )
      }
    >
      {label}
    </Button>
  )
}

function disabledAction({ label, icon, title }: Readonly<{ label: string; icon: ReactNode; title: string }>) {
  return (
    <Button aria-disabled disabled title={title} variant="outline" size="sm">
      {icon}
      {label}
    </Button>
  )
}

function optionalText(value: string | null | undefined): string | null {
  const trimmed = value?.trim()
  return trimmed === undefined || trimmed === '' ? null : trimmed
}

function emailActionFor({
  address,
  enabled,
  copy,
}: Readonly<{ address: string | null; enabled: boolean; copy: RecordCopy }>): ReactNode {
  if (address === null) return null
  if (enabled) return actionLink({ href: `mailto:${address}`, label: copy.email, icon: <Mail aria-hidden /> })
  return disabledAction({ label: copy.email, icon: <MailWarning aria-hidden />, title: copy.sendingUnavailableBody })
}

export function RecordActionLinks({
  recordType,
  recordId,
  recordLabel,
  editHref,
  email,
  phone,
  outboundEmailEnabled = true,
  archive,
  copy,
}: Readonly<{
  copy: RecordCopy
  recordType: 'contact' | 'organization' | 'lead' | 'deal'
  recordId: string
  recordLabel: string
  editHref?: string
  email?: string | null
  phone?: string | null
  outboundEmailEnabled?: boolean
  /** The Archive control, already gated on the viewer's role by the page. */
  archive?: ReactNode
}>) {
  const taskHref = `/tasks/new?${new URLSearchParams({
    relatedType: recordType,
    relatedId: recordId,
    title: copy.followUpWith.replace('{name}', recordLabel),
  }).toString()}`
  const emailAddress = optionalText(email)
  const phoneNumber = optionalText(phone)
  return (
    <div className="flex flex-wrap items-center gap-2">
      {emailActionFor({ address: emailAddress, enabled: outboundEmailEnabled, copy })}
      {phoneNumber === null
        ? null
        : actionLink({ href: `tel:${phoneNumber}`, label: copy.call, icon: <Phone aria-hidden /> })}
      {phoneNumber === null || recordType === 'deal' ? null : (
        <SendTextDialog recordType={recordType} recordId={recordId} recipient={phoneNumber} />
      )}
      {actionLink({ href: taskHref, label: copy.newTask, icon: <ClipboardPlus aria-hidden /> })}
      {editHref === undefined ? null : actionLink({ href: editHref, label: copy.edit, icon: <Pencil aria-hidden /> })}
      {archive}
    </div>
  )
}
