/**
 * The names a workspace may rename in Settings, Terminology. Each key is the one the navigation, headers and command
 * menu read (`SHELL_COPY`), so a saved name shows up everywhere that term appears. Anything else stored beside these
 * (onboarding progress, group names) is not editable here and must survive a save.
 */
export const TERMINOLOGY_KEYS = ['organizations', 'contacts', 'leads', 'deals', 'projects', 'tasks'] as const

export type TerminologyKey = (typeof TERMINOLOGY_KEYS)[number]

/** The singular keys an earlier form saved; they never reached the navigation, so they are read once and dropped. */
export const LEGACY_TERMINOLOGY_KEYS: Readonly<Record<TerminologyKey, string>> = {
  organizations: 'organization',
  contacts: 'contact',
  leads: 'lead',
  deals: 'deal',
  projects: 'project',
  tasks: 'task',
}

export const MAX_TERM_LENGTH = 40
