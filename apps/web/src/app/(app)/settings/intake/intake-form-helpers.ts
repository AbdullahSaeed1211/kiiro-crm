interface FormValues {
  name: string
  key: string
  active: boolean
  allowedOrigins: string
  requireTurnstile: boolean
  defaultOwnerId: string
  defaultAssigneeIds: readonly string[]
  defaultSourceId: string
  notifyUserIds: readonly string[]
  notifyGroupIds: readonly string[]
  successMessage: string
  redirectUrl: string
  emailAlias: string
}

type SetValuesAction = (fn: (current: FormValues) => FormValues) => void

export function createFieldUpdater(setValues: SetValuesAction) {
  const set =
    <K extends keyof FormValues>(key: K) =>
    (value: FormValues[K]) => {
      setValues((current) => ({ ...current, [key]: value }))
    }
  return {
    updateName: set('name'),
    updateKey: set('key'),
    updateActive: set('active'),
    updateAllowedOrigins: set('allowedOrigins'),
    updateRequireTurnstile: set('requireTurnstile'),
    updateDefaultOwnerId: set('defaultOwnerId'),
    updateDefaultAssigneeIds: set('defaultAssigneeIds'),
    updateDefaultSourceId: set('defaultSourceId'),
    updateNotifyUserIds: set('notifyUserIds'),
    updateNotifyGroupIds: set('notifyGroupIds'),
    updateSuccessMessage: set('successMessage'),
    updateRedirectUrl: set('redirectUrl'),
    updateEmailAlias: set('emailAlias'),
  }
}

export function generateEmbedSnippet(endpoint: string): string {
  return `<form action="${endpoint}" method="post">
  <label>Email <input name="email" type="email" required></label>
  <label>Name <input name="name"></label>
  <label>Message <textarea name="message"></textarea></label>
  <button type="submit">Send</button>
</form>`
}

export function generateServerSnippet(endpoint: string, generatedKey: string | undefined): string {
  return `await fetch('${endpoint}', {
  method: 'POST',
  headers: { 'content-type': 'application/json', 'x-intake-key': '${generatedKey ?? '<generate a server key above>'}' },
  body: JSON.stringify({ name: 'Example', email: 'lead@example.com', message: 'Hello' }),
})`
}

export function initializeValues(form: {
  name: string
  key: string
  active: boolean
  allowedOrigins: readonly string[]
  requireTurnstile: boolean
  defaultOwnerId?: string
  defaultAssigneeIds: readonly string[]
  defaultSourceId?: string
  notifyUserIds: readonly string[]
  notifyGroupIds: readonly string[]
  successMessage: string
  redirectUrl: string
  emailAlias: string
}): FormValues {
  return {
    name: form.name,
    key: form.key,
    active: form.active,
    allowedOrigins: form.allowedOrigins.join('\n'),
    requireTurnstile: form.requireTurnstile,
    defaultOwnerId: form.defaultOwnerId ?? '',
    defaultAssigneeIds: [...form.defaultAssigneeIds],
    defaultSourceId: form.defaultSourceId ?? '',
    notifyUserIds: [...form.notifyUserIds],
    notifyGroupIds: [...form.notifyGroupIds],
    successMessage: form.successMessage,
    redirectUrl: form.redirectUrl,
    emailAlias: form.emailAlias,
  }
}
