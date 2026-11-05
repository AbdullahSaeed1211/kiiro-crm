import { normalizeLocale } from '../i18n/locale'
import type { RequestContext } from './container'
import { getWorkspaceSettings } from './auth/context'
import { loadPeople } from './people'

/** The names of the people a log row points at, and the workspace language its event words are written in. */
export async function loadLogContext(context: RequestContext, actorIds: readonly string[]) {
  const [people, settings] = await Promise.all([loadPeople(context, [...actorIds]), getWorkspaceSettings()])
  return { people, locale: normalizeLocale(settings.locale) }
}
