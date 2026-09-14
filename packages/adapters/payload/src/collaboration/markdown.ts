/** Escapes HTML before markdown-lite substitutions are applied. */
export function escapeMarkdownHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

/**
 * Renders the deliberately small comment format after HTML escaping, so source text cannot introduce a tag or event
 * handler. Link markup stays text until a richer, separately reviewed renderer is added.
 */
export function renderMarkdownLite(source: string): string {
  let html = escapeMarkdownHtml(source)
  html = html.replace(/`([^`\n]+)`/g, '<code>$1</code>')
  html = html.replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>')
  html = html.replace(/\*([^*\n]+)\*/g, '<em>$1</em>')
  return html.replaceAll('\n', '<br />')
}
