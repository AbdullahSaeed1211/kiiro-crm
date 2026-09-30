const RELOADED_KEY = 'stale-assets-reloaded'

/** True for the error a page throws when a release replaced the scripts it was opened with. */
export function isStaleAssetError(error: Error): boolean {
  return (
    error.name === 'ChunkLoadError' ||
    /loading (?:css )?chunk|failed to fetch dynamically imported/iu.test(error.message)
  )
}

/** Reloads the page once per browser tab, so a release that swapped the scripts cannot cause a reload loop. */
export function reloadOnce(): void {
  try {
    if (window.sessionStorage.getItem(RELOADED_KEY) === 'true') return
    window.sessionStorage.setItem(RELOADED_KEY, 'true')
  } catch {
    // Storage can be blocked; reloading still helps once.
  }
  window.location.reload()
}
