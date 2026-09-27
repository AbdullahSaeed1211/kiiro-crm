const INTERACTIVE_TAGS = new Set(['A', 'BUTTON', 'INPUT', 'SELECT', 'TEXTAREA'])

/** True when a click landed on a control that handles itself, so the row or card must not navigate. */
export function isInteractiveElement(element: HTMLElement): boolean {
  if (INTERACTIVE_TAGS.has(element.tagName)) return true
  if (element.getAttribute('role') === 'checkbox') return true
  return element.closest('a, button, [data-row-click="ignore"]') !== null
}
