'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Button } from '@ops/ui/components/ui/button'
import { BRANDING_FORM_COPY, type BrandingFormCopy } from '../../../../i18n/branding-form-copy'
import { catalogFor } from '../../../../i18n/locale'
import { useLocale } from '../../../../i18n/locale-context'

type AssetName = 'logo' | 'favicon'

/** Uploads one brand file; the message to show when it fails, or `null` when it was saved. */
async function sendAsset(
  upload: Readonly<{ asset: AssetName; body: FormData }>,
  copy: BrandingFormCopy,
): Promise<string | null> {
  const { asset, body } = upload
  try {
    const response = await fetch(`/api/v1/brand/${asset}`, { method: 'POST', body })
    if (response.ok) return null
    const payload = (await response.json().catch(() => ({ error: copy.uploadFailed }))) as { error?: string }
    return payload.error ?? copy.uploadFailed
  } catch {
    return copy.offline
  }
}

export function BrandingSettingsForm({
  logoKey,
  faviconKey,
}: Readonly<{ logoKey?: string | null; faviconKey?: string | null }>) {
  const router = useRouter()
  const copy = catalogFor(BRANDING_FORM_COPY, useLocale())
  const [version, setVersion] = useState(() => String(Date.now()))
  const [status, setStatus] = useState('')
  const [busy, setBusy] = useState<AssetName | null>(null)
  const upload = async (asset: AssetName, file: File | undefined) => {
    if (!file) return
    if (file.size > 1024 * 1024) {
      setStatus(copy.tooLarge)
      return
    }
    setBusy(asset)
    setStatus(copy.uploading)
    const body = new FormData()
    body.set('file', file)
    const failure = await sendAsset({ asset, body }, copy)
    setBusy(null)
    if (failure !== null) {
      setStatus(failure)
      return
    }
    setVersion(String(Date.now()))
    setStatus(copy.updated.replace('{name}', copy[asset]))
    // Shows the new picture and the Remove button without a reload.
    router.refresh()
  }
  const remove = async (asset: AssetName) => {
    setBusy(asset)
    const response = await fetch(`/api/v1/brand/${asset}`, { method: 'DELETE' }).catch(() => null)
    setBusy(null)
    setVersion(String(Date.now()))
    setStatus(response?.ok === true ? copy.removed.replace('{name}', copy[asset]) : copy.removeFailed)
    if (response?.ok === true) router.refresh()
  }
  const asset = (name: AssetName, key?: string | null) => (
    <div className="grid gap-3 border-t pt-4 sm:grid-cols-[8rem_1fr_auto] sm:items-center">
      <div className="flex h-16 items-center justify-center border bg-muted/20 p-2">
        {key ? (
          <img className="max-h-full max-w-full object-contain" src={`/api/v1/brand/${name}?v=${version}`} alt="" />
        ) : (
          <span className="text-xs text-muted-foreground">{copy.noFile}</span>
        )}
      </div>
      <div>
        <p className="text-sm font-medium">{copy[name]}</p>
        <p className="text-xs text-muted-foreground">{copy.formats}</p>
      </div>
      <div className="flex gap-2">
        <label className="inline-flex h-9 cursor-pointer items-center border px-3 text-xs font-medium hover:bg-muted">
          {busy === name ? copy.uploading : copy.choose}
          <input
            className="sr-only"
            type="file"
            accept="image/png,image/jpeg,image/svg+xml,image/webp,image/gif,image/x-icon"
            disabled={busy !== null}
            onChange={(event) => void upload(name, event.target.files?.[0])}
          />
        </label>
        {key ? (
          <Button variant="outline" size="lg" type="button" disabled={busy !== null} onClick={() => void remove(name)}>
            {copy.remove}
          </Button>
        ) : null}
      </div>
    </div>
  )
  return (
    <div className="space-y-4">
      {asset('logo', logoKey)}
      {asset('favicon', faviconKey)}
      <p className="text-xs text-muted-foreground" role="status">
        {status}
      </p>
    </div>
  )
}
