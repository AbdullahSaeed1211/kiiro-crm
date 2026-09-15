export function taskHref(taskId: string, returnTo: string): string {
  return `/tasks/${encodeURIComponent(taskId)}?${new URLSearchParams({ panel: '1', returnTo }).toString()}`
}
