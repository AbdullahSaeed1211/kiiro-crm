import { SEARCH_COPY, SHELL_COPY } from '../i18n/config'
import { normalizeLocale } from '../i18n/locale'
import { NAV_COPY } from '../i18n/nav-copy'
import { getWorkspaceSettings } from './auth/context'

/**
 * Names for page headers, in the workspace's language. A name the workspace renamed in Settings, Terminology wins, so
 * a breadcrumb reads the same as the sidebar link it belongs to.
 */
export async function shellLabels(): Promise<(key: string) => string> {
  const settings = await getWorkspaceSettings()
  const locale = normalizeLocale(settings.locale)
  const terms = (settings.terminology ?? {}) as Record<string, unknown>
  const names: Readonly<Record<string, string | undefined>> = {
    ...SEARCH_COPY[locale],
    ...SHELL_COPY[locale],
    ...NAV_COPY[locale],
  }
  return (key) => {
    const renamed = terms[key]
    if (typeof renamed === 'string' && renamed !== '') return renamed
    return names[key] ?? key
  }
}
