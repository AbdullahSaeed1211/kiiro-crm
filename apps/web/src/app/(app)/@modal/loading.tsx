'use client'

import { SHELL_COPY } from '../../../i18n/config'
import { useLocale } from '../../../i18n/locale-context'

/** Isolate pending overlays so the originating workspace stays mounted and visible. */
export default function ModalLoading() {
  const locale = useLocale()
  return (
    <div
      role="status"
      className="fixed right-4 bottom-4 z-50 rounded-lg border bg-popover px-4 py-2 text-sm text-popover-foreground shadow-sm"
    >
      {SHELL_COPY[locale].loadingPage}
    </div>
  )
}
