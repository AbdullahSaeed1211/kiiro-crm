/* eslint-disable max-lines-per-function, sonarjs/no-nested-conditional -- compact asset labels intentionally share one render branch. */
'use client'

import { useState } from 'react'

type AssetName = 'logo' | 'favicon'

export function BrandingSettingsForm({
  logoKey,
  faviconKey,
}: Readonly<{ logoKey?: string | null; faviconKey?: string | null }>) {
  const [version, setVersion] = useState(() => String(Date.now()))
  const [status, setStatus] = useState('')
  const [busy, setBusy] = useState<AssetName | null>(null)
  const upload = async (asset: AssetName, file: File | undefined) => {
    if (!file) return
    if (file.size > 1024 * 1024) {
      setStatus('Brand assets must be 1 MB or smaller.')
      return
    }
    setBusy(asset)
    setStatus('Uploading…')
    const body = new FormData()
    body.set('file', file)
    const response = await fetch(`/api/v1/brand/${asset}`, { method: 'POST', body })
    setBusy(null)
    if (!response.ok) {
      const payload = (await response.json().catch(() => ({ error: 'Upload failed.' }))) as { error?: string }
      setStatus(payload.error ?? 'Upload failed.')
      return
    }
    setVersion(String(Date.now()))
    setStatus(`${asset === 'logo' ? 'Logo' : 'Favicon'} updated.`)
  }
  const remove = async (asset: AssetName) => {
    setBusy(asset)
    const response = await fetch(`/api/v1/brand/${asset}`, { method: 'DELETE' })
    setBusy(null)
    setVersion(String(Date.now()))
    setStatus(response.ok ? `${asset === 'logo' ? 'Logo' : 'Favicon'} removed.` : 'Unable to remove asset.')
  }
  const asset = (name: AssetName, key?: string | null) => (
    <div className="grid gap-3 border-t pt-4 sm:grid-cols-[8rem_1fr_auto] sm:items-center">
      <div className="flex h-16 items-center justify-center border bg-muted/20 p-2">
        {key ? (
          <img className="max-h-full max-w-full object-contain" src={`/api/v1/brand/${name}?v=${version}`} alt="" />
        ) : (
          <span className="text-xs text-muted-foreground">No file</span>
        )}
      </div>
      <div>
        <p className="text-sm font-medium">{name === 'logo' ? 'Logo' : 'Favicon'}</p>
        <p className="text-xs text-muted-foreground">PNG, JPEG, SVG, WebP, GIF, or ICO · 1 MB max</p>
      </div>
      <div className="flex gap-2">
        <label className="inline-flex h-9 cursor-pointer items-center border px-3 text-xs font-medium hover:bg-muted">
          {busy === name ? 'Uploading…' : 'Choose file'}
          <input
            className="sr-only"
            type="file"
            accept="image/png,image/jpeg,image/svg+xml,image/webp,image/gif,image/x-icon"
            disabled={busy !== null}
            onChange={(event) => void upload(name, event.target.files?.[0])}
          />
        </label>
        {key ? (
          <button
            className="h-9 border px-3 text-xs hover:bg-muted"
            type="button"
            disabled={busy !== null}
            onClick={() => void remove(name)}
          >
            Remove
          </button>
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
