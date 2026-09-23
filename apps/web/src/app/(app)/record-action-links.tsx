import { Button } from '@ops/ui/components/ui/button'
import { ClipboardPlus, Mail, MailWarning, Pencil, Phone } from 'lucide-react'
import type { ReactNode } from 'react'
import Link from 'next/link'

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

function disabledAction(label: string, icon: ReactNode) {
  return (
    <Button
      aria-disabled
      disabled
      title="Email sending will be available after Cloudflare Email Sending is enabled."
      variant="outline"
      size="sm"
    >
      {icon}
      {label}
    </Button>
  )
}

function optionalText(value: string | null | undefined): string | null {
  const trimmed = value?.trim()
  return trimmed === undefined || trimmed === '' ? null : trimmed
}

function emailActionFor(emailAddress: string | null, outboundEmailEnabled: boolean): ReactNode {
  if (emailAddress === null) return null
  if (outboundEmailEnabled)
    return actionLink({ href: `mailto:${emailAddress}`, label: 'Email', icon: <Mail aria-hidden /> })
  return disabledAction('Email', <MailWarning aria-hidden />)
}

export function RecordActionLinks({
  recordType,
  recordId,
  recordLabel,
  editHref,
  email,
  phone,
  outboundEmailEnabled = true,
}: Readonly<{
  recordType: 'contact' | 'organization' | 'lead' | 'deal'
  recordId: string
  recordLabel: string
  editHref?: string
  email?: string | null
  phone?: string | null
  outboundEmailEnabled?: boolean
}>) {
  const taskHref = `/tasks/new?${new URLSearchParams({
    relatedType: recordType,
    relatedId: recordId,
    title: `Follow up with ${recordLabel}`,
  }).toString()}`
  const emailAddress = optionalText(email)
  const phoneNumber = optionalText(phone)
  return (
    <div className="flex flex-wrap items-center gap-2">
      {emailActionFor(emailAddress, outboundEmailEnabled)}
      {phoneNumber === null
        ? null
        : actionLink({ href: `tel:${phoneNumber}`, label: 'Call', icon: <Phone aria-hidden /> })}
      {actionLink({ href: taskHref, label: 'New task', icon: <ClipboardPlus aria-hidden /> })}
      {editHref === undefined ? null : actionLink({ href: editHref, label: 'Edit', icon: <Pencil aria-hidden /> })}
    </div>
  )
}
